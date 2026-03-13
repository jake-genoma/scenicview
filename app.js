const form = document.getElementById('planner-form');
const results = document.getElementById('results');
const statusCard = document.getElementById('status');
const timingSummary = document.getElementById('timingSummary');
const poiList = document.getElementById('poiList');
const openGoogle = document.getElementById('openGoogle');
const openApple = document.getElementById('openApple');

const scenicnessEl = document.getElementById('scenicness');
const scenicnessValueEl = document.getElementById('scenicnessValue');
const roundTripEl = document.getElementById('roundTrip');
const roundTripFieldsEl = document.getElementById('roundTripFields');
const returnArriveByEl = document.getElementById('returnArriveBy');

scenicnessValueEl.textContent = scenicnessEl.value;
scenicnessEl.addEventListener('input', () => (scenicnessValueEl.textContent = scenicnessEl.value));
roundTripEl.addEventListener('change', () => {
  roundTripFieldsEl.hidden = !roundTripEl.checked;
  returnArriveByEl.required = roundTripEl.checked;
  if (!roundTripEl.checked) returnArriveByEl.value = '';
});

const nominatimSearchBase = 'https://nominatim.openstreetmap.org/search';
const nominatimReverseBase = 'https://nominatim.openstreetmap.org/reverse';
const overpassBase = 'https://overpass-api.de/api/interpreter';
const wikiBase = 'https://en.wikipedia.org/w/api.php';
const osrmBase = 'https://router.project-osrm.org/route/v1/driving';
const MAX_STOPS = 10;

const FALLBACK_POI_CATALOG = [
  { name: 'Yosemite National Park', lat: 37.8651, lon: -119.5383, type: 'park' },
  { name: 'Big Sur Coastline Viewpoint', lat: 36.2704, lon: -121.8078, type: 'viewpoint' },
  { name: 'Point Reyes National Seashore', lat: 38.069, lon: -122.8069, type: 'park' },
  { name: 'Muir Woods National Monument', lat: 37.8954, lon: -122.578, type: 'park' },
  { name: 'Acadia National Park', lat: 44.3386, lon: -68.2733, type: 'park' },
  { name: 'Blue Ridge Parkway Scenic Area', lat: 35.5951, lon: -82.5515, type: 'viewpoint' },
  { name: 'Local Farm-to-Table Restaurant', lat: 38.5816, lon: -121.4944, type: 'food' },
  { name: 'Regional State Recreation Area', lat: 34.1367, lon: -118.2942, type: 'park' },
  { name: 'Mountain Campground', lat: 39.2232, lon: -120.1011, type: 'campground' },
  { name: 'Banff Town Center', lat: 51.1784, lon: -115.5708, type: 'city' },
];

const reverseCache = new Map();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideStatus();

  const data = new FormData(form);
  const origin = data.get('origin').toString().trim();
  const destination = data.get('destination').toString().trim();
  const departAt = new Date(data.get('departAt').toString());
  const arriveBy = new Date(data.get('arriveBy').toString());
  const isRoundTrip = roundTripEl.checked;
  const returnArriveBy = isRoundTrip ? new Date(data.get('returnArriveBy').toString()) : null;

  const scenicness = clamp(Number(data.get('scenicness')), 0, 100);
  const stopTime = clamp(Number(data.get('stopTime')), 0, 180);
  const preferredStops = clamp(Number(data.get('preferredStops')), 1, 100);
  const includeDriveThrough = document.getElementById('includeDriveThrough').checked;
  const includeVisitStops = document.getElementById('includeVisitStops').checked;
  const includeFood = document.getElementById('includeFood').checked;
  const includeParks = document.getElementById('includeParks').checked;

  if (!origin || !destination || Number.isNaN(departAt.getTime()) || Number.isNaN(arriveBy.getTime())) {
    showStatus('Please enter valid route and time values.');
    return;
  }

  if (arriveBy <= departAt) {
    showStatus('Destination arrival must be after departure.');
    return;
  }

  if (isRoundTrip && (!returnArriveBy || Number.isNaN(returnArriveBy.getTime()) || returnArriveBy <= arriveBy)) {
    showStatus('For round trip, return-home arrival must be after destination arrival.');
    return;
  }

  try {
    const [originGeo, destinationGeo] = await Promise.all([geocode(origin), geocode(destination)]);
    if (!isInContinentalNorthAmerica(originGeo) || !isInContinentalNorthAmerica(destinationGeo)) {
      showStatus('ScenicView currently supports continental North America (Canada, U.S., Mexico mainland).');
      return;
    }

    const outboundWindowMinutes = Math.floor((arriveBy - departAt) / 60000);
    const returnWindowMinutes = isRoundTrip ? Math.floor((returnArriveBy - arriveBy) / 60000) : 0;

    const outboundDirectMinutes = await estimateDirectDriveMinutes(originGeo, destinationGeo);
    const returnDirectMinutes = isRoundTrip ? await estimateDirectDriveMinutes(destinationGeo, originGeo) : 0;

    const cappedStops = Math.min(preferredStops, MAX_STOPS);
    const outboundStopTarget = isRoundTrip ? Math.max(1, Math.ceil(cappedStops / 2)) : cappedStops;
    const returnStopTarget = isRoundTrip ? Math.max(1, Math.floor(cappedStops / 2)) : 0;

    const options = { scenicness, includeFood, includeParks, includeDriveThrough, includeVisitStops, stopTime };

    const outboundSelected = await planLeg({
      startGeo: originGeo,
      endGeo: destinationGeo,
      availableMinutes: outboundWindowMinutes,
      preferredStops: outboundStopTarget,
      options,
      legLabel: 'Outbound',
    });

    const returnSelected = isRoundTrip
      ? await planLeg({
          startGeo: destinationGeo,
          endGeo: originGeo,
          availableMinutes: returnWindowMinutes,
          preferredStops: returnStopTarget,
          options,
          legLabel: 'Return',
        })
      : [];

    const allSelected = [...outboundSelected, ...returnSelected].slice(0, MAX_STOPS);
    if (!allSelected.length) {
      showStatus('Not enough time for scenic stops with the chosen windows. Increase time or lower stop-time preference.');
      return;
    }

    const described = await enrichDescriptions(allSelected);

    const outboundDriveWithStops = await estimateDriveMinutesForWaypoints(originGeo, destinationGeo, described.filter((s) => s.leg === 'Outbound'));
    const returnDriveWithStops = isRoundTrip
      ? await estimateDriveMinutesForWaypoints(destinationGeo, originGeo, described.filter((s) => s.leg === 'Return'))
      : 0;

    const outboundStopMinutes = Math.round(described.filter((s) => s.leg === 'Outbound').reduce((a, b) => a + b.estimatedStopMinutes, 0));
    const returnStopMinutes = Math.round(described.filter((s) => s.leg === 'Return').reduce((a, b) => a + b.estimatedStopMinutes, 0));

    renderPlan({
      origin,
      destination,
      isRoundTrip,
      returnArriveBy,
      outboundWindowMinutes,
      returnWindowMinutes,
      outboundDirectMinutes,
      returnDirectMinutes,
      outboundDriveWithStops,
      returnDriveWithStops,
      outboundStopMinutes,
      returnStopMinutes,
      preferredStops: cappedStops,
      selected: described,
    });
  } catch (error) {
    showStatus(`Could not build route due to a network or lookup issue: ${error.message}`);
  }
});

async function planLeg({ startGeo, endGeo, availableMinutes, preferredStops, options, legLabel }) {
  const candidatePool = await buildPoiPool({
    originGeo: startGeo,
    destinationGeo: endGeo,
    scenicness: options.scenicness,
    includeFood: options.includeFood,
    includeParks: options.includeParks,
  });

  const filtered = applyTypeFilters(candidatePool, {
    includeDriveThrough: options.includeDriveThrough,
    includeVisitStops: options.includeVisitStops,
    includeFood: options.includeFood,
    includeParks: options.includeParks,
  });

  const ranked = rankCandidates(filtered, options.scenicness);
  const selected = await planStopsWithinTime({
    ranked,
    originGeo: startGeo,
    destinationGeo: endGeo,
    availableMinutes,
    stopTime: options.stopTime,
    preferredCapped: Math.min(preferredStops, MAX_STOPS),
  });

  return selected.map((x) => ({ ...x, leg: legLabel }));
}

async function buildPoiPool({ originGeo, destinationGeo, scenicness, includeFood, includeParks }) {
  const midpoint = { lat: (originGeo.lat + destinationGeo.lat) / 2, lon: (originGeo.lon + destinationGeo.lon) / 2 };
  const routeKm = haversineKm(originGeo, destinationGeo);
  const radius = Math.round(30000 + scenicness * 1000 + Math.min(routeKm * 350, 150000));
  const settled = await Promise.allSettled([
    fetchOverpassPois(midpoint, radius, { includeFood, includeParks }),
    fetchWikipediaPois(midpoint, radius),
  ]);
  const pooled = [];
  settled.forEach((res) => {
    if (res.status === 'fulfilled') pooled.push(...res.value);
  });
  pooled.push(...FALLBACK_POI_CATALOG.map((x) => ({ ...x, source: 'fallback', tags: {} })));
  return dedupePois(pooled).filter((p) => isInContinentalNorthAmerica(p));
}

async function fetchOverpassPois(center, radius, { includeFood, includeParks }) {
  const parksQuery = includeParks
    ? `
      nwr(around:${radius},${center.lat},${center.lon})[leisure=park];
      nwr(around:${radius},${center.lat},${center.lon})[boundary=national_park];
      nwr(around:${radius},${center.lat},${center.lon})[boundary=protected_area];
      nwr(around:${radius},${center.lat},${center.lon})[tourism=viewpoint];
      nwr(around:${radius},${center.lat},${center.lon})[tourism=camp_site];
    `
    : '';
  const foodQuery = includeFood ? `nwr(around:${radius},${center.lat},${center.lon})[amenity=restaurant];` : '';

  const query = `[out:json][timeout:25];(${parksQuery}${foodQuery}
      nwr(around:${radius},${center.lat},${center.lon})[tourism=attraction];
      nwr(around:${radius},${center.lat},${center.lon})[historic];
      nwr(around:${radius},${center.lat},${center.lon})[natural];
      nwr(around:${radius},${center.lat},${center.lon})[place~"city|town|village"];
    ); out center 300;`;

  const response = await fetchWithRetry(overpassBase, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: query,
  });
  const json = await response.json();
  return (json.elements || [])
    .map((el) => {
      const lat = Number(el.lat ?? el.center?.lat);
      const lon = Number(el.lon ?? el.center?.lon);
      const tags = el.tags || {};
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return {
        name: tags.name || tags['name:en'] || tags.official_name || inferNameFromTags(tags),
        lat,
        lon,
        type: classifyPoi(tags),
        tags,
        source: 'overpass',
      };
    })
    .filter(Boolean);
}

async function fetchWikipediaPois(center, radius) {
  const params = new URLSearchParams({
    action: 'query',
    list: 'geosearch',
    gscoord: `${center.lat}|${center.lon}`,
    gsradius: String(Math.min(radius, 250000)),
    gslimit: '60',
    format: 'json',
    origin: '*',
  });
  const response = await fetchWithRetry(`${wikiBase}?${params}`, { method: 'GET', headers: { Accept: 'application/json' } });
  const json = await response.json();
  return (json.query?.geosearch || []).map((row) => ({
    name: row.title,
    lat: Number(row.lat),
    lon: Number(row.lon),
    type: 'landmark',
    source: 'wikipedia',
    tags: {},
  }));
}

function applyTypeFilters(candidates, options) {
  return candidates.filter((poi) => {
    const visitClass = classifyVisitStyle(poi.type);
    if (!options.includeDriveThrough && visitClass === 'drive-through') return false;
    if (!options.includeVisitStops && visitClass === 'visit') return false;
    if (!options.includeFood && poi.type === 'food') return false;
    if (!options.includeParks && ['park', 'viewpoint', 'campground'].includes(poi.type)) return false;
    return true;
  });
}

function rankCandidates(candidates, scenicness) {
  return [...candidates].map((poi) => ({ ...poi, score: scorePoi(poi, scenicness) })).sort((a, b) => b.score - a.score);
}

async function planStopsWithinTime({ ranked, originGeo, destinationGeo, availableMinutes, stopTime, preferredCapped }) {
  const selected = [];
  for (const candidate of ranked) {
    if (selected.length >= preferredCapped || selected.length >= MAX_STOPS) break;
    const estimatedStopMinutes = estimateStopDuration(candidate.type, stopTime);
    const tentative = [...selected, { ...candidate, estimatedStopMinutes }];
    const driveMinutes = await estimateDriveMinutesForWaypoints(originGeo, destinationGeo, tentative);
    const stopMinutes = tentative.reduce((sum, p) => sum + p.estimatedStopMinutes, 0);
    if (driveMinutes + stopMinutes <= availableMinutes) selected.push({ ...candidate, estimatedStopMinutes });
  }
  return selected;
}

function estimateStopDuration(type, userPreferenceMinutes) {
  const baseline = { viewpoint: 12, food: 45, park: 60, campground: 120, city: 50, landmark: 35, historic: 35, natural: 30 }[type] || 30;
  if (userPreferenceMinutes === 0) return Math.max(5, Math.round(baseline * 0.5));
  return Math.max(5, Math.min(240, Math.round(baseline * 0.65 + userPreferenceMinutes * 0.35)));
}

function scorePoi(poi, scenicness) {
  const sourceWeight = poi.source === 'overpass' ? 1.5 : poi.source === 'wikipedia' ? 1.2 : 1;
  const scenicBoost = {
    viewpoint: 1 + scenicness / 60,
    park: 1 + scenicness / 80,
    campground: 1 + scenicness / 75,
    natural: 1 + scenicness / 90,
    landmark: 1 + scenicness / 110,
    historic: 1 + scenicness / 120,
    city: 1,
    food: restaurantQualityScore(poi, scenicness),
  }[poi.type] || 1;
  const chainPenalty = isChainRestaurant(poi) ? (scenicness > 60 ? 0.65 : 1.05) : scenicness > 60 ? 1.2 : 1;
  return sourceWeight * scenicBoost * chainPenalty;
}

function restaurantQualityScore(poi, scenicness) {
  if (poi.type !== 'food') return 1;
  const tags = poi.tags || {};
  const hasCuisine = tags.cuisine ? 1.12 : 1;
  const scenicFood = tags.cuisine?.includes('seafood') || tags.cuisine?.includes('regional') || tags.cuisine?.includes('local') || /view|coast|mountain|river|farm/i.test(poi.name) ? 1.2 : 0.95;
  const quickFood = isChainRestaurant(poi) ? 1.2 : 0.95;
  return hasCuisine * (scenicness >= 50 ? scenicFood : quickFood);
}

function classifyVisitStyle(type) {
  return ['viewpoint', 'landmark', 'natural'].includes(type) ? 'drive-through' : 'visit';
}

async function enrichDescriptions(selected) {
  const settled = await Promise.allSettled(selected.map((poi) => reverseLookup(poi.lat, poi.lon)));
  return selected.map((poi, i) => ({ ...poi, description: buildDescription(poi, settled[i].status === 'fulfilled' ? settled[i].value : null) }));
}

function buildDescription(poi, reverse) {
  const near = reverse?.near ? ` near ${reverse.near}` : '';
  const country = reverse?.country ? ` in ${reverse.country}` : '';
  const typeText = {
    viewpoint: 'Scenic viewpoint with strong photo value',
    park: 'Park/recreation area suitable for walks or short hikes',
    campground: 'Campground-style stop suitable for longer journey breaks',
    food: 'Restaurant stop selected to fit your scenic preference level',
    city: 'Town/city area with local character and services',
    historic: 'Historic location with local context and attractions',
    natural: 'Natural feature stop with outdoors appeal',
    landmark: 'Notable attraction that adds variety to the route',
  }[poi.type] || 'Interesting stop along your route';
  return `${typeText}${near}${country}. Recommended stop: about ${poi.estimatedStopMinutes} min.`;
}

async function reverseLookup(lat, lon) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (reverseCache.has(key)) return reverseCache.get(key);
  const url = `${nominatimReverseBase}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=json&zoom=10`;
  try {
    const response = await fetchWithRetry(url, { method: 'GET', headers: { Accept: 'application/json' } });
    const addr = (await response.json()).address || {};
    const out = { near: addr.city || addr.town || addr.village || addr.county || addr.state || null, country: addr.country || null };
    reverseCache.set(key, out);
    return out;
  } catch {
    const out = { near: null, country: null };
    reverseCache.set(key, out);
    return out;
  }
}

function renderPlan(context) {
  const {
    origin, destination, isRoundTrip, outboundWindowMinutes, returnWindowMinutes, outboundDirectMinutes, returnDirectMinutes,
    outboundDriveWithStops, returnDriveWithStops, outboundStopMinutes, returnStopMinutes, preferredStops, selected,
  } = context;

  if (isRoundTrip) {
    timingSummary.textContent = `Round trip planned. Outbound window: ${outboundWindowMinutes} min (direct ~${outboundDirectMinutes}, planned drive ~${outboundDriveWithStops}, stops ~${outboundStopMinutes}). Return window: ${returnWindowMinutes} min (direct ~${returnDirectMinutes}, planned drive ~${returnDriveWithStops}, stops ~${returnStopMinutes}). Total stops planned: ${selected.length}/${Math.min(preferredStops, MAX_STOPS)}.`;
  } else {
    timingSummary.textContent = `One-way trip planned. Window: ${outboundWindowMinutes} min, direct ~${outboundDirectMinutes} min, planned drive ~${outboundDriveWithStops} min, planned stop time ~${outboundStopMinutes} min. Stops: ${selected.length}/${Math.min(preferredStops, MAX_STOPS)}.`;
  }

  poiList.innerHTML = '';
  selected.forEach((poi) => {
    const li = document.createElement('li');
    li.textContent = `${poi.leg}: ${poi.name} (${poi.type}) — ${poi.description}`;
    poiList.appendChild(li);
  });

  const outStops = selected.filter((s) => s.leg === 'Outbound').map((x) => `${x.lat},${x.lon}`);
  const retStops = selected.filter((s) => s.leg === 'Return').map((x) => `${x.lat},${x.lon}`);

  const googleWaypoints = isRoundTrip
    ? [...outStops, destination, ...retStops].slice(0, MAX_STOPS)
    : outStops.slice(0, MAX_STOPS);
  const googleDestination = isRoundTrip ? origin : destination;

  openGoogle.href =
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(googleDestination)}&travelmode=driving` +
    (googleWaypoints.length ? `&waypoints=${encodeURIComponent(googleWaypoints.join('|'))}` : '');

  const appleStops = isRoundTrip
    ? [...outStops, destination, ...retStops, origin].slice(0, MAX_STOPS + 1)
    : [...outStops, destination];

  openApple.href =
    `https://maps.apple.com/?saddr=${encodeURIComponent(origin)}` +
    `&daddr=${encodeURIComponent(appleStops.join(' to:'))}&dirflg=d`;

  results.hidden = false;
}

async function geocode(query) {
  const url = `${nominatimSearchBase}?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const response = await fetchWithRetry(url, { method: 'GET', headers: { Accept: 'application/json' } });
  const rows = await response.json();
  if (!rows.length) throw new Error(`No map match found for "${query}".`);
  return { lat: Number(rows[0].lat), lon: Number(rows[0].lon) };
}

async function estimateDirectDriveMinutes(origin, destination) {
  const url = `${osrmBase}/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=false&steps=false`;
  try {
    const res = await fetchWithRetry(url, { method: 'GET', headers: { Accept: 'application/json' } });
    const sec = (await res.json()).routes?.[0]?.duration;
    if (sec) return Math.max(1, Math.round(sec / 60));
  } catch {}
  return Math.max(1, Math.round((haversineKm(origin, destination) * 1.28 * 60) / 72));
}

async function estimateDriveMinutesForWaypoints(origin, destination, waypoints) {
  const capped = waypoints.slice(0, MAX_STOPS);
  if (!capped.length) return estimateDirectDriveMinutes(origin, destination);
  const coords = [`${origin.lon},${origin.lat}`, ...capped.map((w) => `${w.lon},${w.lat}`), `${destination.lon},${destination.lat}`].join(';');
  const url = `${osrmBase}/${coords}?overview=false&steps=false`;
  try {
    const res = await fetchWithRetry(url, { method: 'GET', headers: { Accept: 'application/json' } });
    const sec = (await res.json()).routes?.[0]?.duration;
    if (sec) return Math.max(1, Math.round(sec / 60));
  } catch {}
  const hops = [origin, ...capped, destination];
  let km = 0;
  for (let i = 0; i < hops.length - 1; i += 1) km += haversineKm(hops[i], hops[i + 1]);
  return Math.max(1, Math.round((km * 1.33 * 60) / 70));
}

async function fetchWithRetry(url, init, maxAttempts = 3) {
  let lastError;
  for (let i = 1; i <= maxAttempts; i += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000 + i * 2000);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      await sleep(250 * i + Math.random() * 300);
    }
  }
  throw lastError || new Error('Network request failed.');
}

function classifyPoi(tags) {
  if (tags.amenity === 'restaurant' || tags.cuisine) return 'food';
  if (tags.tourism === 'camp_site') return 'campground';
  if (tags.leisure === 'park' || tags.boundary === 'national_park' || tags.boundary === 'protected_area') return 'park';
  if (tags.tourism === 'viewpoint') return 'viewpoint';
  if (tags.place === 'city' || tags.place === 'town' || tags.place === 'village') return 'city';
  if (tags.historic) return 'historic';
  if (tags.natural) return 'natural';
  return 'landmark';
}

function inferNameFromTags(tags) {
  return `${tags.tourism || tags.amenity || tags.leisure || tags.place || 'Scenic location'}`;
}

function isChainRestaurant(poi) {
  const tags = poi.tags || {};
  return Boolean(tags.brand || tags.brand_wikidata || tags.operator);
}

function dedupePois(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${(item.name || '').toLowerCase()}|${Number(item.lat).toFixed(4)}|${Number(item.lon).toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isInContinentalNorthAmerica(point) {
  return point.lat >= 14 && point.lat <= 84 && point.lon >= -170 && point.lon <= -52;
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function toRad(deg) { return (deg * Math.PI) / 180; }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function showStatus(message) {
  statusCard.hidden = false;
  statusCard.textContent = message;
  results.hidden = true;
}

function hideStatus() {
  statusCard.hidden = true;
  statusCard.textContent = '';
}

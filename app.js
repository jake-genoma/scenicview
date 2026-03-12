const form = document.getElementById('planner-form');
const results = document.getElementById('results');
const statusCard = document.getElementById('status');
const timingSummary = document.getElementById('timingSummary');
const poiList = document.getElementById('poiList');
const openGoogle = document.getElementById('openGoogle');
const openApple = document.getElementById('openApple');

const scenicnessEl = document.getElementById('scenicness');
const scenicnessValueEl = document.getElementById('scenicnessValue');
scenicnessValueEl.textContent = scenicnessEl.value;
scenicnessEl.addEventListener('input', () => {
  scenicnessValueEl.textContent = scenicnessEl.value;
});

const nominatimSearchBase = 'https://nominatim.openstreetmap.org/search';
const overpassBase = 'https://overpass-api.de/api/interpreter';
const wikiBase = 'https://en.wikipedia.org/w/api.php';
const osrmBase = 'https://router.project-osrm.org/route/v1/driving';

const FALLBACK_POI_CATALOG = [
  { name: 'Yosemite National Park', lat: 37.8651, lon: -119.5383, type: 'park' },
  { name: 'Big Sur Coastline Viewpoint', lat: 36.2704, lon: -121.8078, type: 'viewpoint' },
  { name: 'Point Reyes National Seashore', lat: 38.069, lon: -122.8069, type: 'park' },
  { name: 'Muir Woods National Monument', lat: 37.8954, lon: -122.578 },
  { name: 'Lake Tahoe Scenic Overlook', lat: 39.0968, lon: -120.0324, type: 'viewpoint' },
  { name: 'Santa Barbara Waterfront', lat: 34.409, lon: -119.694, type: 'viewpoint' },
  { name: 'Golden Gate Vista Point', lat: 37.8266, lon: -122.4799, type: 'viewpoint' },
  { name: 'Bixby Creek Bridge View', lat: 36.3712, lon: -121.9019, type: 'viewpoint' },
  { name: 'Zion National Park', lat: 37.2982, lon: -113.0263, type: 'park' },
  { name: 'Bryce Canyon National Park', lat: 37.593, lon: -112.1871, type: 'park' },
  { name: 'Grand Canyon South Rim', lat: 36.0544, lon: -112.1401, type: 'park' },
  { name: 'Acadia National Park', lat: 44.3386, lon: -68.2733, type: 'park' },
  { name: 'Blue Ridge Parkway Scenic Area', lat: 35.5951, lon: -82.5515, type: 'viewpoint' },
  { name: 'Smoky Mountains Scenic Pull-off', lat: 35.6118, lon: -83.4895, type: 'viewpoint' },
  { name: 'Historic Downtown District', lat: 39.7392, lon: -104.9903, type: 'city' },
  { name: 'Local Farm-to-Table Restaurant', lat: 38.5816, lon: -121.4944, type: 'food' },
  { name: 'Cliffside Seafood Restaurant', lat: 36.6002, lon: -121.8947, type: 'food' },
  { name: 'Regional State Recreation Area', lat: 34.1367, lon: -118.2942, type: 'park' },
  { name: 'Scenic Historic Main Street', lat: 40.7608, lon: -111.891, type: 'city' },
  { name: 'Mountain Pass Viewpoint', lat: 39.1911, lon: -106.8175, type: 'viewpoint' },
];

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideStatus();

  const data = new FormData(form);
  const origin = data.get('origin').toString().trim();
  const destination = data.get('destination').toString().trim();
  const departAt = new Date(data.get('departAt').toString());
  const arriveBy = new Date(data.get('arriveBy').toString());
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

  const availableMinutes = Math.floor((arriveBy - departAt) / 60000);
  if (availableMinutes <= 0) {
    showStatus('Arrival must be after departure.');
    return;
  }

  try {
    const [originGeo, destinationGeo] = await Promise.all([geocode(origin), geocode(destination)]);
    const directMinutes = await estimateDirectDriveMinutes(originGeo, destinationGeo);
    const extraMinutes = Math.max(0, availableMinutes - directMinutes);

    const candidatePool = await buildPoiPool({
      originGeo,
      destinationGeo,
      scenicness,
      includeFood,
      includeParks,
    });

    const filteredByType = applyTypeFilters(candidatePool, {
      includeDriveThrough,
      includeVisitStops,
      includeFood,
      includeParks,
    });

    const stopBudgetByTime = stopTime > 0 ? Math.floor(extraMinutes / stopTime) : preferredStops;
    const allowedStops = Math.max(1, Math.min(preferredStops, stopBudgetByTime || preferredStops));
    const selected = chooseStops(filteredByType, allowedStops, scenicness);

    renderPlan({
      origin,
      destination,
      availableMinutes,
      directMinutes,
      extraMinutes,
      stopTime,
      preferredStops,
      selected,
    });
  } catch (error) {
    showStatus(`Could not build route due to a network or lookup issue: ${error.message}`);
  }
});

async function buildPoiPool({ originGeo, destinationGeo, scenicness, includeFood, includeParks }) {
  const midpoint = {
    lat: (originGeo.lat + destinationGeo.lat) / 2,
    lon: (originGeo.lon + destinationGeo.lon) / 2,
  };

  const radius = Math.round(25000 + scenicness * 1200);

  const tasks = [
    fetchOverpassPois(midpoint, radius, { includeFood, includeParks }),
    fetchWikipediaPois(midpoint, radius),
  ];

  const settled = await Promise.allSettled(tasks);
  const pooled = [];

  settled.forEach((result) => {
    if (result.status === 'fulfilled') pooled.push(...result.value);
  });

  pooled.push(...FALLBACK_POI_CATALOG.map((x) => ({ ...x, source: 'fallback' })));

  return dedupePois(pooled);
}

async function fetchOverpassPois(center, radius, { includeFood, includeParks }) {
  const parkPart = includeParks
    ? `
      node(around:${radius},${center.lat},${center.lon})[leisure=park];
      node(around:${radius},${center.lat},${center.lon})[boundary=national_park];
      node(around:${radius},${center.lat},${center.lon})[tourism=viewpoint];
      node(around:${radius},${center.lat},${center.lon})[boundary=protected_area];
    `
    : '';

  const foodPart = includeFood
    ? `node(around:${radius},${center.lat},${center.lon})[amenity=restaurant];`
    : '';

  const query = `
    [out:json][timeout:25];
    (
      ${parkPart}
      ${foodPart}
      node(around:${radius},${center.lat},${center.lon})[tourism=attraction];
      node(around:${radius},${center.lat},${center.lon})[historic];
      node(around:${radius},${center.lat},${center.lon})[natural];
    );
    out center 220;
  `;

  const response = await fetchWithRetry(overpassBase, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: query,
  });

  const json = await response.json();
  return (json.elements || [])
    .filter((el) => el.lat && el.lon && el.tags)
    .map((el) => ({
      name:
        el.tags.name ||
        el.tags['name:en'] ||
        el.tags.official_name ||
        `${el.tags.tourism || el.tags.amenity || el.tags.leisure || 'Scenic location'}`,
      lat: Number(el.lat),
      lon: Number(el.lon),
      type: classifyPoi(el.tags),
      source: 'overpass',
    }));
}

async function fetchWikipediaPois(center, radius) {
  const params = new URLSearchParams({
    action: 'query',
    list: 'geosearch',
    gscoord: `${center.lat}|${center.lon}`,
    gsradius: String(Math.min(radius, 100000)),
    gslimit: '50',
    format: 'json',
    origin: '*',
  });

  const response = await fetchWithRetry(`${wikiBase}?${params}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const json = await response.json();
  return (json.query?.geosearch || []).map((row) => ({
    name: row.title,
    lat: Number(row.lat),
    lon: Number(row.lon),
    type: 'landmark',
    source: 'wikipedia',
  }));
}

function applyTypeFilters(candidates, options) {
  const { includeDriveThrough, includeVisitStops, includeFood, includeParks } = options;

  return candidates.filter((poi, index) => {
    const driveThrough = index % 2 === 0;
    if (!includeDriveThrough && driveThrough) return false;
    if (!includeVisitStops && !driveThrough) return false;
    if (!includeFood && poi.type === 'food') return false;
    if (!includeParks && (poi.type === 'park' || poi.type === 'viewpoint')) return false;
    return true;
  });
}

function chooseStops(candidates, count, scenicness) {
  const ranked = [...candidates].sort((a, b) => scorePoi(b, scenicness) - scorePoi(a, scenicness));
  const picks = [];
  const seenTypes = new Set();

  for (const poi of ranked) {
    if (picks.length >= count) break;
    if (seenTypes.size < 4 && seenTypes.has(poi.type) && Math.random() < 0.45) continue;
    picks.push(poi);
    seenTypes.add(poi.type);
  }

  return picks.length ? picks : ranked.slice(0, Math.max(1, count));
}

function scorePoi(poi, scenicness) {
  const sourceWeight = poi.source === 'overpass' ? 2 : poi.source === 'wikipedia' ? 1.4 : 1;
  const scenicBoost = ['park', 'viewpoint', 'landmark', 'natural'].includes(poi.type) ? scenicness / 25 : 1;
  const foodBoost = poi.type === 'food' ? 1.1 : 1;
  return sourceWeight * scenicBoost * foodBoost;
}

function renderPlan({
  origin,
  destination,
  availableMinutes,
  directMinutes,
  extraMinutes,
  stopTime,
  preferredStops,
  selected,
}) {
  timingSummary.textContent = `Trip window: ${availableMinutes} min. Estimated direct drive: ~${directMinutes} min. Scenic time available: ~${extraMinutes} min. Requested stops: ${preferredStops}. Stop-time preference: ${stopTime} min. Planned route includes ${selected.length} curated scenic stops.`;

  poiList.innerHTML = '';
  selected.forEach((poi, i) => {
    const li = document.createElement('li');
    const style = i % 2 === 0 ? 'Drive-through highlight' : 'Visit stop';
    li.textContent = `${poi.name} (${poi.type}, ${style})`;
    poiList.appendChild(li);
  });

  const waypointCoords = selected.map((x) => `${x.lat},${x.lon}`);
  openGoogle.href =
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(destination)}&travelmode=driving` +
    (waypointCoords.length ? `&waypoints=${encodeURIComponent(waypointCoords.join('|'))}` : '');

  const appleStops = [...waypointCoords, destination].join(' to:');
  openApple.href =
    `https://maps.apple.com/?saddr=${encodeURIComponent(origin)}` +
    `&daddr=${encodeURIComponent(appleStops)}&dirflg=d`;

  results.hidden = false;
}

async function geocode(query) {
  const url = `${nominatimSearchBase}?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const rows = await response.json();
  if (!rows.length) throw new Error(`No map match found for "${query}".`);

  return { lat: Number(rows[0].lat), lon: Number(rows[0].lon) };
}

async function estimateDirectDriveMinutes(origin, destination) {
  const url =
    `${osrmBase}/${origin.lon},${origin.lat};${destination.lon},${destination.lat}` +
    '?overview=false&alternatives=false&steps=false';

  try {
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const json = await response.json();
    const seconds = json.routes?.[0]?.duration;
    if (seconds) return Math.max(1, Math.round(seconds / 60));
  } catch {
    // Fallback below
  }

  const km = haversineKm(origin, destination);
  const minutes = (km * 1.28 * 60) / 72;
  return Math.max(1, Math.round(minutes));
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
      await sleep(250 * i + Math.random() * 400);
    }
  }

  throw lastError || new Error('Network request failed.');
}

function classifyPoi(tags) {
  if (tags.amenity === 'restaurant' || tags.cuisine) return 'food';
  if (tags.leisure === 'park' || tags.boundary === 'national_park' || tags.boundary === 'protected_area') return 'park';
  if (tags.tourism === 'viewpoint') return 'viewpoint';
  if (tags.historic) return 'historic';
  if (tags.natural) return 'natural';
  if (tags.tourism === 'attraction') return 'landmark';
  return 'landmark';
}

function dedupePois(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.name.toLowerCase()}|${item.lat.toFixed(4)}|${item.lon.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showStatus(message) {
  statusCard.hidden = false;
  statusCard.textContent = message;
  results.hidden = true;
}

function hideStatus() {
  statusCard.hidden = true;
  statusCard.textContent = '';
}

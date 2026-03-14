const form = document.getElementById('planner-form');
const buildBtn = document.getElementById('buildBtn');
const results = document.getElementById('results');
const statusCard = document.getElementById('status');
const timingSummary = document.getElementById('timingSummary');
const poiList = document.getElementById('poiList');
const openGoogle = document.getElementById('openGoogle');
const openApple = document.getElementById('openApple');
const loadingCard = document.getElementById('loadingCard');
const loadingBar = document.getElementById('loadingBar');
const loadingText = document.getElementById('loadingText');

const prioritySliderIds = ['priorityScenic', 'priorityThings', 'priorityFood'];
prioritySliderIds.forEach((id) => {
  const el = document.getElementById(id);
  const out = document.getElementById(`${id}Value`);
  out.textContent = el.value;
  el.addEventListener('input', () => (out.textContent = el.value));
});

const roundTripEl = document.getElementById('roundTrip');
const roundTripFieldsEl = document.getElementById('roundTripFields');
const returnArriveByEl = document.getElementById('returnArriveBy');
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
const MULTI_DAY_SLEEP_MIN = 6 * 60;
const MULTI_DAY_SLEEP_MAX = 9 * 60;

const US_NATIONAL_PARKS = [
  ['Acadia National Park', 44.3386, -68.2733], ['American Samoa National Park', -14.2583, -170.6833],
  ['Arches National Park', 38.7331, -109.5925], ['Badlands National Park', 43.8554, -102.3397],
  ['Big Bend National Park', 29.1275, -103.2425], ['Biscayne National Park', 25.4824, -80.2088],
  ['Black Canyon of the Gunnison National Park', 38.5754, -107.7416], ['Bryce Canyon National Park', 37.593, -112.1871],
  ['Canyonlands National Park', 38.3269, -109.8783], ['Capitol Reef National Park', 38.2, -111.167],
  ['Carlsbad Caverns National Park', 32.1479, -104.5567], ['Channel Islands National Park', 34.01, -119.42],
  ['Congaree National Park', 33.7914, -80.7821], ['Crater Lake National Park', 42.9446, -122.109],
  ['Cuyahoga Valley National Park', 41.2808, -81.5678], ['Death Valley National Park', 36.5054, -117.0794],
  ['Denali National Park', 63.1148, -151.1926], ['Dry Tortugas National Park', 24.6285, -82.8732],
  ['Everglades National Park', 25.2866, -80.8987], ['Gates of the Arctic National Park', 67.78, -153.3],
  ['Gateway Arch National Park', 38.6247, -90.1848], ['Glacier National Park', 48.6967, -113.7183],
  ['Glacier Bay National Park', 58.6658, -136.9002], ['Grand Canyon National Park', 36.1069, -112.1129],
  ['Grand Teton National Park', 43.7904, -110.6818], ['Great Basin National Park', 38.9833, -114.3],
  ['Great Sand Dunes National Park', 37.7916, -105.5943], ['Great Smoky Mountains National Park', 35.6118, -83.4895],
  ['Guadalupe Mountains National Park', 31.923, -104.8858], ['Haleakala National Park', 20.7204, -156.1552],
  ['Hawaii Volcanoes National Park', 19.4194, -155.2885], ['Hot Springs National Park', 34.521, -93.0424],
  ['Indiana Dunes National Park', 41.6533, -87.0524], ['Isle Royale National Park', 47.9958, -88.9093],
  ['Joshua Tree National Park', 33.8734, -115.901], ['Katmai National Park', 58.5, -155.0],
  ['Kenai Fjords National Park', 59.92, -149.65], ['Kings Canyon National Park', 36.8879, -118.5551],
  ['Kobuk Valley National Park', 67.55, -159.28], ['Lake Clark National Park', 60.97, -153.42],
  ['Lassen Volcanic National Park', 40.4977, -121.4207], ['Mammoth Cave National Park', 37.186, -86.101],
  ['Mesa Verde National Park', 37.2309, -108.4618], ['Mount Rainier National Park', 46.8797, -121.7269],
  ['New River Gorge National Park', 38.0686, -81.0832], ['North Cascades National Park', 48.7718, -121.2985],
  ['Olympic National Park', 47.8021, -123.6044], ['Petrified Forest National Park', 34.9099, -109.8068],
  ['Pinnacles National Park', 36.4864, -121.1825], ['Redwood National Park', 41.2132, -124.0046],
  ['Rocky Mountain National Park', 40.3428, -105.6836], ['Saguaro National Park', 32.2967, -111.1666],
  ['Sequoia National Park', 36.4864, -118.5658], ['Shenandoah National Park', 38.53, -78.35],
  ['Theodore Roosevelt National Park', 46.979, -103.5387], ['Virgin Islands National Park', 18.3428, -64.7412],
  ['Voyageurs National Park', 48.4839, -92.838], ['White Sands National Park', 32.7872, -106.3257],
  ['Wind Cave National Park', 43.57, -103.48], ['Wrangell-St Elias National Park', 61.0, -142.0],
  ['Yellowstone National Park', 44.428, -110.5885], ['Yosemite National Park', 37.8651, -119.5383],
  ['Zion National Park', 37.2982, -113.0263],
].map(([name, lat, lon]) => ({ name, lat, lon, type: 'park', minStayMinutes: 360, source: 'fallback' }));

const SIGNIFICANT_LOCATIONS = [
  { name: 'Banff National Park', lat: 51.4968, lon: -115.9281, type: 'park', minStayMinutes: 300, source: 'fallback' },
  { name: 'Jasper National Park', lat: 52.8737, lon: -117.9543, type: 'park', minStayMinutes: 300, source: 'fallback' },
  { name: 'Pacific Rim National Park Reserve', lat: 49.0833, lon: -125.75, type: 'park', minStayMinutes: 300, source: 'fallback' },
  { name: 'Copper Canyon', lat: 27.5239, lon: -107.7417, type: 'natural', minStayMinutes: 300, source: 'fallback' },
  { name: 'Barranca del Cobre Viewpoint', lat: 27.5132, lon: -107.7448, type: 'viewpoint', minStayMinutes: 240, source: 'fallback' },
  { name: 'Chichen Itza', lat: 20.6843, lon: -88.5678, type: 'historic', minStayMinutes: 240, source: 'fallback' },
  { name: 'Big Sur Scenic Coast', lat: 36.2704, lon: -121.8078, type: 'viewpoint', minStayMinutes: 240, source: 'fallback' },
  { name: 'Niagara Falls State Park', lat: 43.0962, lon: -79.0377, type: 'viewpoint', minStayMinutes: 240, source: 'fallback' },
];

const FALLBACK_POI_CATALOG = [...US_NATIONAL_PARKS, ...SIGNIFICANT_LOCATIONS];
const reverseCache = new Map();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideStatus();
  setLoading(true, 5, 'Starting route build...');

  const data = new FormData(form);
  const origin = data.get('origin').toString().trim();
  const destination = data.get('destination').toString().trim();
  const departAt = new Date(data.get('departAt').toString());
  const arriveBy = new Date(data.get('arriveBy').toString());
  const isRoundTrip = roundTripEl.checked;
  const returnArriveBy = isRoundTrip ? new Date(data.get('returnArriveBy').toString()) : null;
  const priorities = {
    scenic: clamp(Number(data.get('priorityScenic')), 0, 100),
    thingsToDo: clamp(Number(data.get('priorityThings')), 0, 100),
    food: clamp(Number(data.get('priorityFood')), 0, 100),
  };
  const stopTime = clamp(Number(data.get('stopTime')), 0, 180);
  const preferredStops = clamp(Number(data.get('preferredStops')), 1, 100);

  if (!origin || !destination || Number.isNaN(departAt.getTime()) || Number.isNaN(arriveBy.getTime())) {
    setLoading(false);
    showStatus('Please enter valid route and time values.');
    return;
  }
  if (arriveBy <= departAt) {
    setLoading(false);
    showStatus('Destination arrival must be after departure.');
    return;
  }
  if (isRoundTrip && (!returnArriveBy || Number.isNaN(returnArriveBy.getTime()) || returnArriveBy <= arriveBy)) {
    setLoading(false);
    showStatus('For round trip, return-home arrival must be after destination arrival.');
    return;
  }

  try {
    setLoading(true, 15, 'Geocoding trip points...');
    const [originGeo, destinationGeo] = await Promise.all([geocode(origin), geocode(destination)]);
    if (!isInContinentalNorthAmerica(originGeo) || !isInContinentalNorthAmerica(destinationGeo)) {
      setLoading(false);
      showStatus('ScenicView currently supports continental North America (Canada, U.S., Mexico mainland).');
      return;
    }

    const outboundWindowMinutes = Math.floor((arriveBy - departAt) / 60000);
    const returnWindowMinutes = isRoundTrip ? Math.floor((returnArriveBy - arriveBy) / 60000) : 0;

    setLoading(true, 25, 'Estimating direct drive times...');
    const outboundDirectMinutes = await estimateDirectDriveMinutes(originGeo, destinationGeo);
    const returnDirectMinutes = isRoundTrip ? await estimateDirectDriveMinutes(destinationGeo, originGeo) : 0;

    const outboundSleepMinutes = estimateSleepMinutes(outboundWindowMinutes);
    const returnSleepMinutes = isRoundTrip ? estimateSleepMinutes(returnWindowMinutes) : 0;
    if (outboundDirectMinutes + outboundSleepMinutes > outboundWindowMinutes) {
      setLoading(false);
      showStatus('Outbound window is too short once drive time and sleep reserve are included. Add more time or choose closer points.');
      return;
    }
    if (isRoundTrip && returnDirectMinutes + returnSleepMinutes > returnWindowMinutes) {
      setLoading(false);
      showStatus('Return window is too short once drive time and sleep reserve are included. Add more time or extend return arrival.');
      return;
    }

    const cappedStops = Math.min(preferredStops, MAX_STOPS);
    const outboundStopTarget = isRoundTrip ? Math.max(1, Math.ceil(cappedStops / 2)) : cappedStops;
    const returnStopTarget = isRoundTrip ? Math.max(1, Math.floor(cappedStops / 2)) : 0;

    const options = { priorities, stopTime };

    setLoading(true, 40, 'Searching outbound POIs...');
    const outboundSelected = await planLeg({
      startGeo: originGeo,
      endGeo: destinationGeo,
      availableMinutes: outboundWindowMinutes,
      preferredStops: outboundStopTarget,
      options,
      legLabel: 'Outbound',
      isRoundTripLeg: isRoundTrip,
    });

    let returnSelected = [];
    if (isRoundTrip) {
      setLoading(true, 60, 'Searching return-leg POIs...');
      returnSelected = await planLeg({
        startGeo: destinationGeo,
        endGeo: originGeo,
        availableMinutes: returnWindowMinutes,
        preferredStops: returnStopTarget,
        options,
        legLabel: 'Return',
        isRoundTripLeg: true,
      });
    }

    const allSelected = [...outboundSelected, ...returnSelected].slice(0, MAX_STOPS);

    setLoading(true, 75, 'Building stop descriptions...');
    const described = await enrichDescriptions(allSelected);

    setLoading(true, 88, 'Final route timing pass...');
    let outboundStops = described.filter((s) => s.leg === 'Outbound');
    let returnStops = described.filter((s) => s.leg === 'Return');

    outboundStops = await fitStopsToWindow({
      stops: outboundStops,
      originGeo,
      destinationGeo,
      windowMinutes: outboundWindowMinutes,
      sleepMinutes: outboundSleepMinutes,
    });
    if (isRoundTrip) {
      returnStops = await fitStopsToWindow({
        stops: returnStops,
        originGeo: destinationGeo,
        destinationGeo: originGeo,
        windowMinutes: returnWindowMinutes,
        sleepMinutes: returnSleepMinutes,
      });
    }

    const outboundTiming = await computeLegTiming({
      originGeo,
      destinationGeo,
      stops: outboundStops,
      windowMinutes: outboundWindowMinutes,
      sleepMinutes: outboundSleepMinutes,
      directMinutes: outboundDirectMinutes,
    });
    const returnTiming = isRoundTrip
      ? await computeLegTiming({
        originGeo: destinationGeo,
        destinationGeo: originGeo,
        stops: returnStops,
        windowMinutes: returnWindowMinutes,
        sleepMinutes: returnSleepMinutes,
        directMinutes: returnDirectMinutes,
      })
      : { windowMinutes: 0, directMinutes: 0, driveWithStopsMinutes: 0, stopMinutes: 0, sleepMinutes: 0, usedMinutes: 0, slackMinutes: 0 };

    const trimmedSelected = [...outboundStops, ...returnStops];

    setLoading(true, 100, 'Done. Rendering route...');
    renderPlan({
      origin,
      destination,
      isRoundTrip,
      outboundTiming,
      returnTiming,
      preferredStops: cappedStops,
      selected: trimmedSelected,
    });
  } catch (error) {
    showStatus(`Could not build route due to a network or lookup issue: ${error.message}`);
  } finally {
    setLoading(false);
  }
});

async function planLeg({ startGeo, endGeo, availableMinutes, preferredStops, options, legLabel, isRoundTripLeg = false }) {
  const candidatePool = await buildPoiPool({
    originGeo: startGeo,
    destinationGeo: endGeo,
    scenicness: options.priorities.scenic,
    includeFood: true,
    includeParks: true,
  });

  const liveCandidates = candidatePool.filter((poi) => poi.source !== 'fallback');
  const ranked = rankCandidates(liveCandidates.length >= 12 ? liveCandidates : candidatePool, options.priorities);

  const sleepMinutes = estimateSleepMinutes(availableMinutes);
  const effectiveAvailable = Math.max(0, availableMinutes - sleepMinutes);

  const selected = await planStopsWithinTime({
    ranked,
    originGeo: startGeo,
    destinationGeo: endGeo,
    availableMinutes: effectiveAvailable,
    stopTime: options.stopTime,
    preferredCapped: Math.min(preferredStops, MAX_STOPS),
    priorities: options.priorities,
    enforceFoodGapMinutes: 240,
    enforceLegDiversity: isRoundTripLeg,
  });

  return selected.map((x) => ({ ...x, leg: legLabel }));
}

async function buildPoiPool({ originGeo, destinationGeo, scenicness, includeFood, includeParks }) {
  const distanceKm = haversineKm(originGeo, destinationGeo);
  const tuning = buildDiscoveryTuning(distanceKm, scenicness);
  const centers = buildRouteSampleCenters(originGeo, destinationGeo, tuning);

  const categoryCalls = centers.flatMap((center) => [
    fetchOverpassCategory(center, tuning.baseRadius, 'scenic', includeParks),
    fetchOverpassCategory(center, tuning.baseRadius, 'things'),
    fetchOverpassCategory(center, tuning.baseRadius, 'food', includeFood),
  ]);

  const wikiCalls = centers
    .filter((_, idx) => idx % tuning.wikiStride === 1)
    .map((center) => fetchWikipediaPois(center, tuning.wikiRadius));
  const townAnchorsCall = buildTownAnchorsFromCenters(centers);

  // Additional open-data enrichment to expand smaller-town and local venue coverage.
  const nominatimCalls = centers
    .filter((_, idx) => idx % tuning.nominatimStride === 1)
    .flatMap((center) => [
      fetchNominatimCategory(center, 'food', tuning.nominatimRadius, distanceKm >= 1500 ? 55 : 45),
      fetchNominatimCategory(center, 'things', tuning.nominatimRadius, distanceKm >= 1500 ? 55 : 45),
      fetchNominatimCategory(center, 'scenic', Math.round(tuning.nominatimRadius * 0.95), distanceKm >= 1500 ? 45 : 35),
    ]);

  const settled = await Promise.allSettled([...categoryCalls, ...wikiCalls, townAnchorsCall, ...nominatimCalls]);
  const live = [];
  settled.forEach((res) => {
    if (res.status === 'fulfilled') live.push(...res.value);
  });

  const liveDeduped = dedupePois(live).filter((poi) => isInContinentalNorthAmerica(poi));

  const minLiveBeforeFallback = distanceKm >= 1800 ? 22 : distanceKm >= 500 ? 16 : 12;
  if (liveDeduped.length >= minLiveBeforeFallback) return liveDeduped;

  const needed = Math.max(8, tuning.fallbackCount - liveDeduped.length);
  const nearestFallback = FALLBACK_POI_CATALOG
    .map((poi) => ({ ...poi, dist: distanceToSegmentKm(poi, originGeo, destinationGeo) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, needed)
    .map(({ dist, ...poi }) => ({ ...poi, tags: {}, source: 'fallback' }));

  return dedupePois([...liveDeduped, ...nearestFallback]);
}

function buildDiscoveryTuning(distanceKm, scenicness) {
  const shortTripFactor = distanceKm < 260 ? 1 - distanceKm / 260 : 0;
  const longTripFactor = clamp(distanceKm / 3000, 0, 1);
  return {
    sampleCount: Math.round(clamp(5 + distanceKm / 360, 5, 15)),
    baseRadius: Math.round(clamp(15000 + scenicness * 550 + shortTripFactor * 16000 + longTripFactor * 6000, 13000, 43000)),
    nominatimRadius: Math.round(clamp(16000 + scenicness * 420 + shortTripFactor * 12000 + longTripFactor * 3000, 13000, 36000)),
    wikiRadius: Math.round(clamp(28000 + scenicness * 700 + shortTripFactor * 22000 + longTripFactor * 12000, 24000, 90000)),
    jitterKm: clamp(7 + distanceKm * 0.018, 6, 44),
    localExploreKm: shortTripFactor > 0 ? Math.round(18 + shortTripFactor * 30) : 0,
    wikiStride: distanceKm >= 2500 ? 3 : 2,
    nominatimStride: distanceKm >= 1800 ? 3 : 2,
    fallbackCount: Math.round(clamp(10 + distanceKm / 320, 10, 30)),
  };
}

function buildRouteSampleCenters(originGeo, destinationGeo, tuning) {
  const points = [];
  const sampleCount = Math.max(2, tuning.sampleCount);

  for (let i = 0; i < sampleCount; i += 1) {
    const ratio = sampleCount === 1 ? 0 : i / (sampleCount - 1);
    const point = interpolate(originGeo, destinationGeo, ratio);
    points.push(i === 0 || i === sampleCount - 1 ? point : jitterPointNearRoute(point, tuning.jitterKm));
  }

  if (tuning.localExploreKm > 0) {
    const mid = interpolate(originGeo, destinationGeo, 0.5);
    [20, 110, 200, 290].forEach((bearing) => {
      points.push(offsetPointByKm(mid, tuning.localExploreKm, bearing));
    });
  }

  return dedupeCenters(points);
}

function dedupeCenters(points) {
  const seen = new Set();
  return points.filter((p) => {
    const key = `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function jitterPointNearRoute(point, maxJitterKm) {
  const dx = (Math.random() * 2 - 1) * maxJitterKm;
  const dy = (Math.random() * 2 - 1) * maxJitterKm;
  const lat = point.lat + dy / 111;
  const lon = point.lon + dx / (111 * Math.cos(toRad(Math.max(-85, Math.min(85, point.lat)))));
  return { lat, lon };
}

function offsetPointByKm(point, distanceKm, bearingDeg) {
  const brng = toRad(bearingDeg);
  const latDelta = (distanceKm * Math.cos(brng)) / 111;
  const lonDenominator = 111 * Math.cos(toRad(Math.max(-85, Math.min(85, point.lat))));
  const lonDelta = lonDenominator ? (distanceKm * Math.sin(brng)) / lonDenominator : 0;
  return {
    lat: point.lat + latDelta,
    lon: point.lon + lonDelta,
  };
}

async function buildTownAnchorsFromCenters(centers) {
  const settled = await Promise.allSettled(centers.map((c) => reverseLookup(c.lat, c.lon)));
  const anchors = [];

  settled.forEach((res, idx) => {
    if (res.status !== 'fulfilled') return;
    const near = res.value?.near;
    if (!near) return;
    anchors.push({
      name: near,
      lat: centers[idx].lat,
      lon: centers[idx].lon,
      type: 'city',
      source: 'town_anchor',
      tags: { place: 'town' },
    });
  });

  return anchors;
}

async function fetchOverpassCategory(center, radius, category, enabled = true) {
  if (!enabled) return [];

  const queryByCategory = {
    scenic: `
      nwr(around:${radius},${center.lat},${center.lon})[leisure=park];
      nwr(around:${radius},${center.lat},${center.lon})[boundary=national_park];
      nwr(around:${radius},${center.lat},${center.lon})[boundary=protected_area];
      nwr(around:${radius},${center.lat},${center.lon})[tourism=viewpoint];
      nwr(around:${radius},${center.lat},${center.lon})[tourism=camp_site];
      nwr(around:${radius},${center.lat},${center.lon})[natural];
    `,
    things: `
      nwr(around:${radius},${center.lat},${center.lon})[tourism=attraction];
      nwr(around:${radius},${center.lat},${center.lon})[tourism=museum];
      nwr(around:${radius},${center.lat},${center.lon})[tourism=gallery];
      nwr(around:${radius},${center.lat},${center.lon})[tourism=zoo];
      nwr(around:${radius},${center.lat},${center.lon})[tourism=theme_park];
      nwr(around:${radius},${center.lat},${center.lon})[amenity=theatre];
      nwr(around:${radius},${center.lat},${center.lon})[amenity=arts_centre];
      nwr(around:${radius},${center.lat},${center.lon})[historic];
      nwr(around:${radius},${center.lat},${center.lon})[place~"city|town|village|hamlet|suburb|locality"];
    `,
    food: `
      nwr(around:${radius},${center.lat},${center.lon})[amenity=restaurant];
      nwr(around:${radius},${center.lat},${center.lon})[amenity=cafe];
      nwr(around:${radius},${center.lat},${center.lon})[amenity=fast_food];
    `,
  };

  const query = `[out:json][timeout:20];(${queryByCategory[category] || ''}); out center 220;`;
  const response = await fetchWithRetry(overpassBase, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: query,
  }, 2);

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

async function fetchNominatimCategory(center, category, radius, limit = 40) {
  const deltaLon = radius / (111000 * Math.cos(toRad(Math.max(-80, Math.min(80, center.lat)))));
  const deltaLat = radius / 111000;
  const viewbox = [
    center.lon - deltaLon,
    center.lat + deltaLat,
    center.lon + deltaLon,
    center.lat - deltaLat,
  ].join(',');

  const qByCategory = {
    food: 'restaurant cafe diner food',
    things: 'museum gallery historic attraction theater arts center',
    scenic: 'viewpoint scenic park natural reserve',
  };

  const params = new URLSearchParams({
    q: qByCategory[category] || 'attraction',
    format: 'jsonv2',
    limit: String(limit),
    addressdetails: '1',
    viewbox,
    bounded: '1',
  });

  const response = await fetchWithRetry(`${nominatimSearchBase}?${params}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  }, 2);

  const rows = await response.json();
  return (rows || []).map((row) => {
    const tags = {
      amenity: row.type,
      tourism: row.class,
      place: row.type,
      display_name: row.display_name,
      address_city: row.address?.city || row.address?.town || row.address?.village || '',
      address_state: row.address?.state || '',
    };
    const name = buildPreciseName(
      row.name || row.display_name?.split(',')[0] || 'Local place',
      tags,
    );
    return {
      name,
      lat: Number(row.lat),
      lon: Number(row.lon),
      type: classifyPoi(tags),
      tags,
      source: 'nominatim',
    };
  }).filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon));
}

async function fetchWikipediaPois(center, radius) {
  const params = new URLSearchParams({
    action: 'query',
    list: 'geosearch',
    gscoord: `${center.lat}|${center.lon}`,
    gsradius: String(Math.min(radius, 200000)),
    gslimit: '50',
    format: 'json',
    origin: '*',
  });

  const response = await fetchWithRetry(`${wikiBase}?${params}`, { method: 'GET', headers: { Accept: 'application/json' } }, 2);
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

function rankCandidates(candidates, priorities) {
  return [...candidates]
    .map((poi) => ({ ...poi, score: scorePoi(poi, priorities) }))
    .sort((a, b) => b.score - a.score);
}

async function planStopsWithinTime({
  ranked, originGeo, destinationGeo, availableMinutes, stopTime, preferredCapped, priorities,
  enforceFoodGapMinutes = 0, enforceLegDiversity = false,
}) {
  const selected = [];
  const weights = normalizedPriorityWeights(priorities);
  const desiredMix = prioritizeFoodMix(desiredBucketCounts(preferredCapped, weights), preferredCapped, priorities.food, ranked);
  const spreadTargets = buildSpreadTargets(preferredCapped);

  for (const candidate of ranked) {
    if (selected.length >= preferredCapped || selected.length >= MAX_STOPS) break;

    const candidateBucket = priorityBucket(candidate);
    const currentMix = countSelectedBuckets(selected);
    const needsBucket = currentMix[candidateBucket] < desiredMix[candidateBucket];

    if (!needsBucket && selected.length < Math.max(2, Math.floor(preferredCapped * 0.6))) {
      continue;
    }

    const targetProgress = spreadTargets[Math.min(selected.length, spreadTargets.length - 1)] ?? 0.5;
    if (!isSpreadFriendlyCandidate(candidate, selected, originGeo, destinationGeo, targetProgress, preferredCapped, true)) {
      continue;
    }
    if (enforceLegDiversity && shouldSkipForLegDiversity(candidate, selected, preferredCapped)) {
      continue;
    }
    if (violatesFoodSpacing(candidate, selected, originGeo, destinationGeo, availableMinutes, enforceFoodGapMinutes, true)) {
      continue;
    }

    const estimatedStopMinutes = estimateStopDuration(candidate.type, stopTime, candidate.minStayMinutes);
    const tentative = [...selected, { ...candidate, estimatedStopMinutes }];
    const driveMinutes = await estimateDriveMinutesForWaypoints(originGeo, destinationGeo, tentative);
    const stopMinutes = tentative.reduce((sum, p) => sum + p.estimatedStopMinutes, 0);

    if (driveMinutes + stopMinutes <= availableMinutes) {
      selected.push({ ...candidate, estimatedStopMinutes });
    }
  }

  if (selected.length < preferredCapped) {
    for (const candidate of ranked) {
      if (selected.length >= preferredCapped || selected.length >= MAX_STOPS) break;
      if (selected.some((s) => s.name === candidate.name && Math.abs(s.lat - candidate.lat) < 0.001 && Math.abs(s.lon - candidate.lon) < 0.001)) continue;

      const targetProgress = spreadTargets[Math.min(selected.length, spreadTargets.length - 1)] ?? 0.5;
      if (!isSpreadFriendlyCandidate(candidate, selected, originGeo, destinationGeo, targetProgress, preferredCapped, false)) continue;
      if (enforceLegDiversity && shouldSkipForLegDiversity(candidate, selected, preferredCapped)) continue;
      if (violatesFoodSpacing(candidate, selected, originGeo, destinationGeo, availableMinutes, enforceFoodGapMinutes, false)) continue;

      const estimatedStopMinutes = estimateStopDuration(candidate.type, stopTime, candidate.minStayMinutes);
      const tentative = [...selected, { ...candidate, estimatedStopMinutes }];
      const driveMinutes = await estimateDriveMinutesForWaypoints(originGeo, destinationGeo, tentative);
      const stopMinutes = tentative.reduce((sum, p) => sum + p.estimatedStopMinutes, 0);
      if (driveMinutes + stopMinutes <= availableMinutes) selected.push({ ...candidate, estimatedStopMinutes });
    }
  }

  return selected;
}

function desiredBucketCounts(stopCount, weights) {
  const raw = {
    scenic: weights.scenic * stopCount,
    things: weights.thingsToDo * stopCount,
    food: weights.food * stopCount,
  };
  const out = {
    scenic: Math.floor(raw.scenic),
    things: Math.floor(raw.things),
    food: Math.floor(raw.food),
  };

  let used = out.scenic + out.things + out.food;
  const order = [
    ['scenic', raw.scenic - out.scenic],
    ['things', raw.things - out.things],
    ['food', raw.food - out.food],
  ].sort((a, b) => b[1] - a[1]);

  let i = 0;
  while (used < stopCount) {
    out[order[i % order.length][0]] += 1;
    used += 1;
    i += 1;
  }

  return out;
}


function prioritizeFoodMix(baseMix, stopCount, foodPriority, ranked) {
  const out = { ...baseMix };
  const foodCandidates = ranked.filter((poi) => priorityBucket(poi) === 'food').length;
  if (foodCandidates === 0 || stopCount <= 0 || foodPriority < 65) return out;

  let targetFood = out.food;
  if (foodPriority >= 90) targetFood = Math.max(targetFood, Math.ceil(stopCount * 0.6));
  else if (foodPriority >= 80) targetFood = Math.max(targetFood, Math.ceil(stopCount * 0.5));
  else targetFood = Math.max(targetFood, Math.ceil(stopCount * 0.4));

  if (foodPriority >= 70 && stopCount >= 2) targetFood = Math.max(targetFood, 1);
  targetFood = Math.min(targetFood, foodCandidates, stopCount);

  while (out.food < targetFood) {
    if (out.scenic >= out.things && out.scenic > 0) out.scenic -= 1;
    else if (out.things > 0) out.things -= 1;
    else break;
    out.food += 1;
  }

  return out;
}


function buildSpreadTargets(stopCount) {
  if (stopCount <= 0) return [];
  const jitter = Math.min(0.12, 0.35 / (stopCount + 1));
  const targets = [];
  for (let i = 0; i < stopCount; i += 1) {
    const base = (i + 1) / (stopCount + 1);
    const randomNudge = (Math.random() * 2 - 1) * jitter;
    targets.push(clamp(base + randomNudge, 0.02, 0.98));
  }
  return targets;
}

function isSpreadFriendlyCandidate(candidate, selected, originGeo, destinationGeo, targetProgress, preferredCapped, strictTargeting) {
  const candidateProgress = routeProgress(originGeo, destinationGeo, candidate);
  const targetTolerance = strictTargeting ? clamp(0.32 - preferredCapped * 0.015, 0.1, 0.28) : 0.45;
  if (Math.abs(candidateProgress - targetProgress) > targetTolerance) return false;

  if (!selected.length) return true;
  const minGap = clamp(0.82 / (preferredCapped + 1), 0.05, 0.22);
  const tooClose = selected.some((poi) => Math.abs(routeProgress(originGeo, destinationGeo, poi) - candidateProgress) < minGap);
  if (tooClose && strictTargeting) return false;
  return !tooClose || Math.random() > 0.55;
}

function routeProgress(start, end, point) {
  const vx = end.lon - start.lon;
  const vy = end.lat - start.lat;
  const wx = point.lon - start.lon;
  const wy = point.lat - start.lat;
  const denom = vx * vx + vy * vy;
  if (!denom) return 0.5;
  return clamp((wx * vx + wy * vy) / denom, 0, 1);
}


function shouldSkipForLegDiversity(candidate, selected, preferredCapped) {
  if (selected.length < 2 || preferredCapped < 3) return false;
  const counts = countSelectedBuckets(selected);
  const bucket = priorityBucket(candidate);
  const dominantCount = Math.max(counts.scenic, counts.things, counts.food);
  const missingBuckets = Object.values(counts).filter((x) => x === 0).length;
  const candidateWouldBeDominant = counts[bucket] + 1 > dominantCount;
  const earlyPhase = selected.length < Math.ceil(preferredCapped * 0.75);
  return missingBuckets > 0 && candidateWouldBeDominant && earlyPhase;
}

function violatesFoodSpacing(candidate, selected, originGeo, destinationGeo, availableMinutes, gapMinutes, strict) {
  if (candidate.type !== 'food' || gapMinutes <= 0) return false;
  if (availableMinutes < 240) return false;

  const foodStops = selected.filter((x) => x.type === 'food');
  if (!foodStops.length) return false;

  // For sub-8-hour legs, allow up to 3 food stops even if spacing is tighter.
  if (availableMinutes < 480 && foodStops.length < 3) return false;

  const candidateAt = routeProgress(originGeo, destinationGeo, candidate) * availableMinutes;
  const nearestGap = foodStops
    .map((poi) => Math.abs(routeProgress(originGeo, destinationGeo, poi) * availableMinutes - candidateAt))
    .reduce((minGap, gap) => Math.min(minGap, gap), Number.POSITIVE_INFINITY);

  if (nearestGap >= gapMinutes) return false;
  if (strict) return true;
  return nearestGap < gapMinutes * 0.72;
}

function priorityBucket(poi) {
  if (poi.type === 'food') return 'food';
  if (['museum', 'historic', 'activity', 'city', 'landmark'].includes(poi.type)) return 'things';
  return 'scenic';
}

function countSelectedBuckets(selected) {
  return selected.reduce((acc, poi) => {
    acc[priorityBucket(poi)] += 1;
    return acc;
  }, { scenic: 0, things: 0, food: 0 });
}

function estimateStopDuration(type, userPreferenceMinutes, minStayMinutes) {
  const baseline = { viewpoint: 25, food: 50, park: 120, campground: 360, city: 80, landmark: 45, historic: 60, natural: 70 }[type] || 40;
  const userAdjusted = userPreferenceMinutes === 0 ? Math.max(10, Math.round(baseline * 0.5)) : Math.round(baseline * 0.6 + userPreferenceMinutes * 0.4);
  if (minStayMinutes) return Math.max(userAdjusted, minStayMinutes);
  return Math.max(10, Math.min(480, userAdjusted));
}

function estimateSleepMinutes(windowMinutes) {
  const fullDays = Math.floor(windowMinutes / 1440);
  if (fullDays <= 0) return 0;
  const nightly = Math.round((MULTI_DAY_SLEEP_MIN + MULTI_DAY_SLEEP_MAX) / 2);
  return fullDays * nightly;
}

function scorePoi(poi, priorities) {
  const sourceWeight = poi.source === 'overpass' ? 1.9 : poi.source === 'nominatim' ? 1.5 : poi.source === 'wikipedia' ? 1.35 : poi.source === 'town_anchor' ? 1.15 : 0.8;
  const weights = normalizedPriorityWeights(priorities);

  const scenicQuality = scenicQualityScore(poi);
  const thingsQuality = thingsToDoQualityScore(poi);
  const foodQuality = restaurantQualityScore(poi, priorities.food);

  const blended =
    weights.scenic * scenicQuality +
    weights.thingsToDo * thingsQuality +
    weights.food * foodQuality;

  const bucket = priorityBucket(poi);
  const bucketWeight = bucket === 'scenic' ? weights.scenic : bucket === 'things' ? weights.thingsToDo : weights.food;
  const priorityPush = 0.9 + bucketWeight * 1.8;

  const oppositePenalty =
    bucket === 'food' ? (weights.food < 0.15 ? 0.82 : 1)
      : bucket === 'things' ? (weights.thingsToDo < 0.15 ? 0.86 : 1)
      : (weights.scenic < 0.15 ? 0.86 : 1);

  const foodIntentBoost = poi.type === 'food'
    ? (priorities.food >= 85 ? 1.45 : priorities.food >= 70 ? 1.25 : 1)
    : 1;
  const nonFoodDampener = poi.type !== 'food' && priorities.food >= 85 ? 0.88 : 1;

  return sourceWeight * blended * priorityPush * oppositePenalty * foodIntentBoost * nonFoodDampener;
}

function normalizedPriorityWeights(priorities) {
  const scenic = Math.pow(Math.max(0, priorities.scenic) / 100, 1.8);
  const thingsToDo = Math.pow(Math.max(0, priorities.thingsToDo) / 100, 1.8);
  const food = Math.pow(Math.max(0, priorities.food) / 100, 1.8);
  const total = scenic + thingsToDo + food;
  if (total === 0) return { scenic: 1 / 3, thingsToDo: 1 / 3, food: 1 / 3 };
  return {
    scenic: scenic / total,
    thingsToDo: thingsToDo / total,
    food: food / total,
  };
}

function scenicQualityScore(poi) {
  const byType = {
    viewpoint: 2.0,
    park: 1.9,
    campground: 1.75,
    natural: 1.7,
    landmark: 1.25,
    historic: 1.15,
    museum: 0.95,
    activity: 0.95,
    city: 1.0,
    food: 0.75,
  };
  return byType[poi.type] || 1;
}

function thingsToDoQualityScore(poi) {
  const byType = {
    museum: 2.2,
    historic: 2.0,
    activity: 1.95,
    landmark: 1.7,
    city: 1.55,
    park: 1.3,
    campground: 1.2,
    natural: 1.2,
    viewpoint: 1.0,
    food: 1.05,
  };
  return byType[poi.type] || 1;
}

function restaurantQualityScore(poi, foodPriority) {
  if (poi.type !== 'food') {
    return foodPriority >= 70 ? 0.55 : 0.9;
  }

  const tags = poi.tags || {};
  const hasCuisine = tags.cuisine ? 1.14 : 1;
  const tripFoodSignal = /seafood|regional|local|farm|coast|mountain|view|river|bbq|taqueria|bistro|diner/i.test(`${tags.cuisine || ''} ${poi.name}`) ? 1.22 : 0.96;
  const chainPenalty = isChainRestaurant(poi) ? (foodPriority > 60 ? 0.68 : 0.9) : 1.18;
  const sitDownSignal = /restaurant|grill|kitchen|bistro|cantina|cafe/i.test(`${tags.amenity || ''} ${poi.name}`) ? 1.06 : 1;
  return hasCuisine * tripFoodSignal * chainPenalty * sitDownSignal;
}

function classifyVisitStyle(type) {
  return ['viewpoint', 'landmark', 'natural'].includes(type) ? 'drive-through' : 'visit';
}

async function enrichDescriptions(selected) {
  const reverseSettled = await Promise.allSettled(selected.map((poi) => reverseLookup(poi.lat, poi.lon)));
  const summarySettled = await Promise.allSettled(selected.map((poi) => fetchWikiSummaryForTitle(poi.name)));

  return selected.map((poi, i) => {
    const reverse = reverseSettled[i].status === 'fulfilled' ? reverseSettled[i].value : null;
    const summary = summarySettled[i].status === 'fulfilled' ? summarySettled[i].value : null;
    const preciseName = refineSelectedPlaceName(poi, reverse);

    return {
      ...poi,
      preciseName,
      description: buildDescription(poi, reverse, summary),
    };
  });
}

function buildDescription(poi, reverse, wikiSummary) {
  const near = reverse?.near ? ` near ${reverse.near}` : '';
  const country = reverse?.country ? ` in ${reverse.country}` : '';
  const minStayText = poi.minStayMinutes ? ` Minimum recommended stay: ${Math.round(poi.minStayMinutes / 60)}-${Math.round((poi.minStayMinutes + 120) / 60)}h.` : '';
  const typeText = {
    viewpoint: 'Scenic viewpoint with strong photo value.',
    park: 'Park/recreation area suitable for hikes and nature exploration.',
    campground: 'Campground-style stop suitable for longer overnights.',
    food: 'Food stop selected to match your food priority.',
    city: 'Town/city area with local character and services.',
    museum: 'Museum stop with curated exhibits and local culture.',
    activity: 'Activity-focused stop (gallery, theater, zoo, or attraction).',
    historic: 'Historic location with local context and attractions.',
    natural: 'Natural feature stop with outdoors appeal.',
    landmark: 'Notable attraction that adds variety to the route.',
  }[poi.type] || 'Interesting stop along your route.';
  const foodDetails = poi.type === 'food' ? buildFoodDetails(poi) : '';
  const details = wikiSummary ? ` ${wikiSummary}` : '';
  return `${typeText}${foodDetails}${near}${country}${details} Recommended stop: about ${formatMinutesHuman(poi.estimatedStopMinutes)}.${minStayText}`;
}

function buildFoodDetails(poi) {
  const tags = poi.tags || {};
  const cuisine = (tags.cuisine || '').replace(/;/g, ', ');
  const amenity = tags.amenity || '';
  const opening = tags.opening_hours || '';
  const takeaway = tags.takeaway === 'yes' ? ' Takeaway available.' : '';
  const website = tags.website || tags['contact:website'] || '';
  const cuisineText = cuisine ? ` Cuisine: ${cuisine}.` : '';
  const amenityText = amenity && !/restaurant|cafe|fast_food/i.test(amenity) ? ` Type: ${amenity}.` : '';
  const hoursText = opening ? ` Hours: ${opening}.` : '';
  const websiteText = website ? ` Website: ${website}.` : '';
  return `${cuisineText}${amenityText}${hoursText}${takeaway}${websiteText}`;
}

async function fetchWikiSummaryForTitle(title) {
  if (!title || title.length < 3) return '';
  const safeTitle = encodeURIComponent(title.replace(/\s+/g, '_'));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${safeTitle}`;
  try {
    const response = await fetchWithRetry(url, { method: 'GET', headers: { Accept: 'application/json' } }, 1);
    const json = await response.json();
    const extract = (json.extract || '').trim();
    if (!extract) return '';
    return extract.length > 180 ? `${extract.slice(0, 177)}...` : extract;
  } catch {
    return '';
  }
}

function refineSelectedPlaceName(poi, reverse) {
  return buildPreciseName(poi.name, {
    ...(poi.tags || {}),
    address_city: reverse?.near || '',
    address_state: '',
    country: reverse?.country || '',
  });
}

function buildPreciseName(baseName, tags) {
  const name = (baseName || '').trim() || 'Local place';
  const city = tags.address_city || '';
  const state = tags.address_state || '';
  const country = tags.country || '';

  const generic = /^(museum|gallery|restaurant|cafe|fast[_ ]?food|attraction|scenic location|park|viewpoint|historic|local place)$/i.test(name);

  if (generic) {
    const typeLabel = tags.amenity || tags.tourism || tags.place || 'POI';
    const locality = [city, state || country].filter(Boolean).join(', ');
    return locality ? `${typeLabel} — ${locality}` : typeLabel;
  }

  if (city && !name.toLowerCase().includes(city.toLowerCase())) {
    return `${name} (${city}${state ? `, ${state}` : ''})`;
  }

  return name;
}

async function reverseLookup(lat, lon) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (reverseCache.has(key)) return reverseCache.get(key);

  const url = `${nominatimReverseBase}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=json&zoom=10`;
  try {
    const response = await fetchWithRetry(url, { method: 'GET', headers: { Accept: 'application/json' } }, 2);
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

async function computeLegTiming({ originGeo, destinationGeo, stops, windowMinutes, sleepMinutes, directMinutes }) {
  const driveWithStopsMinutes = await estimateDriveMinutesForWaypoints(originGeo, destinationGeo, stops);
  const stopMinutes = Math.round(stops.reduce((a, b) => a + b.estimatedStopMinutes, 0));
  const usedMinutes = driveWithStopsMinutes + stopMinutes + sleepMinutes;
  return {
    windowMinutes,
    directMinutes,
    driveWithStopsMinutes,
    stopMinutes,
    sleepMinutes,
    usedMinutes,
    slackMinutes: windowMinutes - usedMinutes,
  };
}

async function fitStopsToWindow({ stops, originGeo, destinationGeo, windowMinutes, sleepMinutes }) {
  const fitted = [...stops];
  while (fitted.length) {
    const driveMinutes = await estimateDriveMinutesForWaypoints(originGeo, destinationGeo, fitted);
    const stopMinutes = Math.round(fitted.reduce((sum, p) => sum + p.estimatedStopMinutes, 0));
    if (driveMinutes + stopMinutes + sleepMinutes <= windowMinutes) break;
    fitted.pop();
  }
  return fitted;
}

function renderPlan(ctx) {
  const {
    origin, destination, isRoundTrip, outboundTiming, returnTiming, preferredStops, selected,
  } = ctx;

  const outboundSummary = `Outbound: window ${formatMinutesHuman(outboundTiming.windowMinutes)}, direct ~${formatMinutesHuman(outboundTiming.directMinutes)}, drive with stops ~${formatMinutesHuman(outboundTiming.driveWithStopsMinutes)}, stop time ~${formatMinutesHuman(outboundTiming.stopMinutes)}, sleep reserve ~${formatMinutesHuman(outboundTiming.sleepMinutes)}, used ${formatMinutesHuman(outboundTiming.usedMinutes)}, remaining ${formatMinutesSigned(outboundTiming.slackMinutes)}`;

  if (isRoundTrip) {
    const returnSummary = `Return: window ${formatMinutesHuman(returnTiming.windowMinutes)}, direct ~${formatMinutesHuman(returnTiming.directMinutes)}, drive with stops ~${formatMinutesHuman(returnTiming.driveWithStopsMinutes)}, stop time ~${formatMinutesHuman(returnTiming.stopMinutes)}, sleep reserve ~${formatMinutesHuman(returnTiming.sleepMinutes)}, used ${formatMinutesHuman(returnTiming.usedMinutes)}, remaining ${formatMinutesSigned(returnTiming.slackMinutes)}`;
    const totalWindow = outboundTiming.windowMinutes + returnTiming.windowMinutes;
    const totalUsed = outboundTiming.usedMinutes + returnTiming.usedMinutes;
    timingSummary.textContent = `Round trip planned. ${outboundSummary}. ${returnSummary}. Combined used ${formatMinutesHuman(totalUsed)}/${formatMinutesHuman(totalWindow)} (remaining ${formatMinutesSigned(totalWindow - totalUsed)}). Total stops ${selected.length}/${Math.min(preferredStops, MAX_STOPS)}.`;
  } else {
    timingSummary.textContent = `One-way trip planned. ${outboundSummary}. Stops ${selected.length}/${Math.min(preferredStops, MAX_STOPS)}.`;
  }

  poiList.innerHTML = '';
  selected.forEach((poi) => {
    const li = document.createElement('li');
    li.textContent = `${poi.leg}: ${poi.preciseName || poi.name} (${poi.type}) — ${poi.description}`;
    poiList.appendChild(li);
  });

  const outStops = selected.filter((s) => s.leg === 'Outbound').map((x) => `${x.lat},${x.lon}`);
  const retStops = selected.filter((s) => s.leg === 'Return').map((x) => `${x.lat},${x.lon}`);

  const googleWaypoints = isRoundTrip ? [...outStops, destination, ...retStops].slice(0, MAX_STOPS) : outStops.slice(0, MAX_STOPS);
  const googleDestination = isRoundTrip ? origin : destination;

  openGoogle.href =
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(googleDestination)}&travelmode=driving` +
    (googleWaypoints.length ? `&waypoints=${encodeURIComponent(googleWaypoints.join('|'))}` : '');

  const appleStops = isRoundTrip ? [...outStops, destination, ...retStops, origin].slice(0, MAX_STOPS + 1) : [...outStops, destination];
  openApple.href = `https://maps.apple.com/?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(appleStops.join(' to:'))}&dirflg=d`;

  results.hidden = false;
}

async function geocode(query) {
  const url = `${nominatimSearchBase}?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const response = await fetchWithRetry(url, { method: 'GET', headers: { Accept: 'application/json' } }, 2);
  const rows = await response.json();
  if (!rows.length) throw new Error(`No map match found for "${query}".`);
  return { lat: Number(rows[0].lat), lon: Number(rows[0].lon) };
}

async function estimateDirectDriveMinutes(origin, destination) {
  const url = `${osrmBase}/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=false&steps=false`;
  try {
    const response = await fetchWithRetry(url, { method: 'GET', headers: { Accept: 'application/json' } }, 2);
    const sec = (await response.json()).routes?.[0]?.duration;
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
    const response = await fetchWithRetry(url, { method: 'GET', headers: { Accept: 'application/json' } }, 2);
    const sec = (await response.json()).routes?.[0]?.duration;
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
    const timeout = setTimeout(() => controller.abort(), 10000 + i * 2000);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      await sleep(220 * i + Math.random() * 260);
    }
  }
  throw lastError || new Error('Network request failed.');
}

function classifyPoi(tags) {
  if (tags.amenity === 'restaurant' || tags.amenity === 'cafe' || tags.amenity === 'fast_food' || tags.cuisine) return 'food';
  if (tags.tourism === 'camp_site') return 'campground';
  if (tags.tourism === 'museum') return 'museum';
  if (tags.tourism === 'gallery' || tags.amenity === 'arts_centre' || tags.amenity === 'theatre' || tags.tourism === 'zoo' || tags.tourism === 'theme_park') return 'activity';
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

function distanceToSegmentKm(p, a, b) {
  return Math.min(haversineKm(p, a), haversineKm(p, b), haversineKm(p, interpolate(a, b, 0.5)));
}

function interpolate(a, b, t) {
  return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
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

function setLoading(active, pct = 0, text = 'Working...') {
  loadingCard.hidden = !active;
  buildBtn.disabled = active;
  if (active) {
    loadingBar.value = pct;
    loadingText.textContent = text;
  }
}

function toRad(deg) { return (deg * Math.PI) / 180; }
function formatMinutesHuman(totalMinutes) {
  const minutes = Math.max(0, Math.round(totalMinutes || 0));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

function formatMinutesSigned(totalMinutes) {
  const sign = totalMinutes < 0 ? '-' : '';
  return `${sign}${formatMinutesHuman(Math.abs(totalMinutes))}`;
}

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

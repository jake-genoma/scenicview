const form = document.getElementById('planner-form');
const results = document.getElementById('results');
const statusCard = document.getElementById('status');
const timingSummary = document.getElementById('timingSummary');
const poiList = document.getElementById('poiList');
const openGoogle = document.getElementById('openGoogle');
const openApple = document.getElementById('openApple');

const sliderIds = ['scenicness', 'stopTime', 'poiDensity'];
sliderIds.forEach((id) => {
  const el = document.getElementById(id);
  const out = document.getElementById(`${id}Value`);
  out.textContent = el.value;
  el.addEventListener('input', () => (out.textContent = el.value));
});

const nominatimSearchBase = 'https://nominatim.openstreetmap.org/search';
const nominatimReverseBase = 'https://nominatim.openstreetmap.org/reverse';

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideStatus();

  const data = new FormData(form);
  const origin = data.get('origin').toString().trim();
  const destination = data.get('destination').toString().trim();
  const directMinutes = Number(data.get('directMinutes'));
  const arriveBy = new Date(data.get('arriveBy').toString());
  const departAtRaw = data.get('departAt').toString();
  const scenicness = Number(data.get('scenicness'));
  const stopTime = Number(data.get('stopTime'));
  const poiDensity = Number(data.get('poiDensity'));
  const includeQuickPass = document.getElementById('includeQuickPass').checked;
  const includeStops = document.getElementById('includeStops').checked;

  const departAt = departAtRaw ? new Date(departAtRaw) : new Date();

  if (!origin || !destination || Number.isNaN(directMinutes) || directMinutes <= 0) {
    showStatus('Please provide valid route and time values.');
    return;
  }

  const availableMinutes = Math.floor((arriveBy - departAt) / 60000);
  if (availableMinutes < directMinutes) {
    showStatus(
      `You only have ${availableMinutes} minutes, but direct drive needs ~${directMinutes}. Increase available time or reduce route complexity.`,
    );
    return;
  }

  try {
    const [originGeo, destinationGeo] = await Promise.all([geocode(origin), geocode(destination)]);

    const extraMinutes = availableMinutes - directMinutes;
    const scenicBudget = Math.floor(extraMinutes * (0.35 + scenicness / 200));
    const targetPoiCount = Math.max(1, Math.min(8, Math.round((poiDensity / 100) * 8)));
    const avgStop = Math.round(8 + (stopTime / 100) * 52);

    const offRouteCandidates = await buildScenicCandidates({
      originGeo,
      destinationGeo,
      scenicness,
      targetPoiCount,
    });

    const filtered = offRouteCandidates.filter((_, index) => {
      if (!includeQuickPass && index % 2 === 0) return false;
      if (!includeStops && index % 2 === 1) return false;
      return true;
    });

    const usableStops = Math.max(1, Math.min(filtered.length, Math.floor((scenicBudget || 1) / avgStop) + 1));
    const selected = filtered.slice(0, usableStops);

    renderPlan({
      origin,
      destination,
      availableMinutes,
      directMinutes,
      extraMinutes,
      avgStop,
      selected,
    });
  } catch (error) {
    showStatus(`Could not build route: ${error.message}`);
  }
});

async function buildScenicCandidates({ originGeo, destinationGeo, scenicness, targetPoiCount }) {
  const lineDistanceKm = haversineKm(originGeo, destinationGeo);
  const heading = bearingDegrees(originGeo, destinationGeo);
  const maxSideDetourKm = Math.min(70, Math.max(8, (scenicness / 100) * lineDistanceKm * 0.9));
  const minSideDetourKm = Math.max(5, maxSideDetourKm * 0.4);

  const samples = [];
  for (let i = 1; i <= targetPoiCount + 2; i += 1) {
    const progress = i / (targetPoiCount + 3);
    const base = interpolate(originGeo, destinationGeo, progress);
    const side = i % 2 === 0 ? 90 : -90;
    const diagonal = i % 3 === 0 ? 35 : 0;
    const distKm = minSideDetourKm + ((maxSideDetourKm - minSideDetourKm) * i) / (targetPoiCount + 2);
    const point = offsetPoint(base, heading + side + diagonal, distKm);
    samples.push(point);
  }

  const resolved = await Promise.all(samples.map((pt) => reverseGeocode(pt)));
  const unique = dedupeByName(
    resolved
      .filter(Boolean)
      .filter((item) => item.name && item.name.toLowerCase() !== 'unknown'),
  );

  if (!unique.length) {
    return [
      { title: 'Scenic detour viewpoint', lat: originGeo.lat, lon: originGeo.lon },
      { title: 'Historic downtown district', lat: destinationGeo.lat, lon: destinationGeo.lon },
    ];
  }

  return unique.slice(0, targetPoiCount).map((item) => ({
    title: item.name,
    lat: item.lat,
    lon: item.lon,
  }));
}

function renderPlan({ origin, destination, availableMinutes, directMinutes, extraMinutes, avgStop, selected }) {
  timingSummary.textContent = `You have ${availableMinutes} min total. Direct drive is ~${directMinutes} min, leaving ~${extraMinutes} min for scenic detours. Route now intentionally bends off the direct corridor through ${selected.length} scenic locations (~${avgStop} min stop preference).`;

  poiList.innerHTML = '';
  selected.forEach((poi, i) => {
    const li = document.createElement('li');
    const kind = i % 2 === 0 ? 'Drive-through scenic city/area' : 'Visit stop';
    li.textContent = `${poi.title} (${kind})`;
    poiList.appendChild(li);
  });

  const waypointString = selected.map((x) => `${x.lat},${x.lon}`).join('|');
  openGoogle.href =
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(destination)}&travelmode=driving` +
    (waypointString ? `&waypoints=${encodeURIComponent(waypointString)}` : '');

  const appleStops = [...selected.map((x) => `${x.lat},${x.lon}`), destination].join(' to:');
  openApple.href =
    `https://maps.apple.com/?saddr=${encodeURIComponent(origin)}` +
    `&daddr=${encodeURIComponent(appleStops)}&dirflg=d`;

  results.hidden = false;
}

async function geocode(query) {
  const url = `${nominatimSearchBase}?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) throw new Error('Could not geocode locations.');

  const rows = await response.json();
  if (!rows.length) throw new Error(`No map match found for "${query}".`);

  return { lat: Number(rows[0].lat), lon: Number(rows[0].lon) };
}

async function reverseGeocode(point) {
  const url =
    `${nominatimReverseBase}?lat=${encodeURIComponent(point.lat)}` +
    `&lon=${encodeURIComponent(point.lon)}&format=json&zoom=10&addressdetails=1`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) return null;

  const json = await response.json();
  const a = json.address || {};
  const name = a.city || a.town || a.village || a.county || a.state_district || json.name || json.display_name;

  if (!name) return null;

  return {
    name,
    lat: Number(point.lat),
    lon: Number(point.lon),
  };
}

function interpolate(a, b, t) {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lon: a.lon + (b.lon - a.lon) * t,
  };
}

function offsetPoint(origin, bearingDeg, distanceKm) {
  const R = 6371;
  const brng = toRad(bearingDeg);
  const dByR = distanceKm / R;
  const lat1 = toRad(origin.lat);
  const lon1 = toRad(origin.lon);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dByR) + Math.cos(lat1) * Math.sin(dByR) * Math.cos(brng),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(dByR) * Math.cos(lat1),
      Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: toDeg(lat2), lon: toDeg(lon2) };
}

function bearingDegrees(a, b) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function dedupeByName(list) {
  const seen = new Set();
  return list.filter((item) => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return (rad * 180) / Math.PI;
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

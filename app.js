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

const wikiBase = 'https://en.wikipedia.org/w/api.php';
const nominatimBase = 'https://nominatim.openstreetmap.org/search';

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
    const midpoint = {
      lat: (originGeo.lat + destinationGeo.lat) / 2,
      lon: (originGeo.lon + destinationGeo.lon) / 2,
    };

    const extraMinutes = availableMinutes - directMinutes;
    const scenicBudget = Math.floor(extraMinutes * (0.35 + scenicness / 200));
    const targetPoiCount = Math.max(1, Math.min(8, Math.round((poiDensity / 20) * (extraMinutes / 45))));

    const scenicPois = await fetchScenicPois(midpoint, scenicness, targetPoiCount);
    const filteredPois = scenicPois.filter((_, index) => {
      if (!includeQuickPass && index % 2 === 0) return false;
      if (!includeStops && index % 2 === 1) return false;
      return true;
    });

    const avgStop = Math.round(8 + (stopTime / 100) * 52);
    const usableStops = Math.min(filteredPois.length, Math.max(0, Math.floor(scenicBudget / avgStop)));
    const selected = filteredPois.slice(0, Math.max(1, usableStops));

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

function renderPlan({ origin, destination, availableMinutes, directMinutes, extraMinutes, avgStop, selected }) {
  timingSummary.textContent = `You have ${availableMinutes} min total. Direct drive is ~${directMinutes} min, leaving ~${extraMinutes} min for scenic detours. Planned ${selected.length} scenic points (~${avgStop} min per stop preference).`;

  poiList.innerHTML = '';
  selected.forEach((poi, i) => {
    const li = document.createElement('li');
    const kind = i % 2 === 0 ? 'Drive-through point' : 'Visit stop';
    li.textContent = `${poi.title} (${kind})`;
    poiList.appendChild(li);
  });

  const waypointString = selected.map((x) => x.title).join('|');
  openGoogle.href =
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(destination)}&travelmode=driving` +
    (waypointString ? `&waypoints=${encodeURIComponent(waypointString)}` : '');

  const appleStops = [destination, ...selected.map((x) => x.title)].join(' to:');
  openApple.href = `https://maps.apple.com/?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(appleStops)}&dirflg=d`;

  results.hidden = false;
}

async function geocode(query) {
  const url = `${nominatimBase}?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Could not geocode locations.');
  }

  const rows = await response.json();
  if (!rows.length) {
    throw new Error(`No map match found for "${query}".`);
  }

  return { lat: Number(rows[0].lat), lon: Number(rows[0].lon) };
}

async function fetchScenicPois(midpoint, scenicness, limit) {
  const radius = Math.round(4000 + scenicness * 90);
  const params = new URLSearchParams({
    action: 'query',
    list: 'geosearch',
    gscoord: `${midpoint.lat}|${midpoint.lon}`,
    gsradius: String(radius),
    gslimit: String(Math.max(limit * 2, 8)),
    format: 'json',
    origin: '*',
  });

  const response = await fetch(`${wikiBase}?${params}`);
  if (!response.ok) {
    throw new Error('Could not fetch scenic points.');
  }

  const json = await response.json();
  const items = (json.query?.geosearch || []).filter((row) => row.title && row.dist);

  if (!items.length) {
    return [{ title: 'Local scenic byway' }, { title: 'Historic district' }];
  }

  return items.slice(0, limit + 2).map((row) => ({ title: row.title }));
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

# scenicview

ScenicView is a lightweight hosted-web-app-ready route planner for people who want to leave and arrive at specific times while filling extra trip time with scenic stops across continental North America (Canada, U.S., Mexico mainland).

## What it does

- Enter origin, destination, required departure time, and required destination-arrival time.
- Optional round trip mode adds a required return-home arrival time (for example: arrive at destination in 1 day, return home over the next 2 days).
- ScenicView automatically estimates direct drive time (no manual direct-drive input needed).
- Tune settings for:
  - **Scenicness priority** (0-100)
  - **Things to Do priority** (0-100)
  - **Food priority** (0-100)
  - **Stop time preference** (0-180 min per stop)
  - **Preferred stops** (1-100 input, capped to 10 exported stops due to Apple/Google Maps waypoint limits)
- All stop categories are considered by default (scenic, things to do, food) with equalized slider weighting across the three priorities.
- Uses randomized route-sampling points on each run so recalculations can produce different stop candidates.
- Uses multiple POI sources:
  - OpenStreetMap/Overpass (restaurants/cafes/fast food, parks, attractions, museums, galleries, theaters/arts centers, viewpoints, historic and natural places, plus smaller towns)
  - Wikipedia geosearch landmarks
  - Nominatim category discovery around sampled route points (helps expand lesser-known local places)
  - Expanded fallback catalog with all U.S. national parks plus significant Canada/Mexico locations.
- Fallback locations include high minimum-recommended stays (4-8+ hours) and are used only when live discovery is sparse.
- Includes a loading/progress state while route processing is underway.
- Adds Wikipedia summary snippets for many selected stops to give more context on lesser-known places.
- Models stop duration by location type and includes multi-day sleep reserves (6-9h/night modeled as 7.5h baseline) in timing calculations.
- Exports routes to:
  - **Google Maps** (multi-waypoint directions)
  - **Apple Maps** (iPhone-friendly)

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Deploy as a hosted web app

Check out https:/scenicview.genomabfx.com

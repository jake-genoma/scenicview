# scenicview

ScenicView is a lightweight hosted-web-app-ready route planner for people who want to leave and arrive at specific times while filling extra trip time with scenic stops across continental North America (Canada, U.S., Mexico mainland).

## What it does

- Enter origin, destination, required departure time, and required destination-arrival time.
- Optional round trip mode adds a required return-home arrival time (for example: arrive at destination in 1 day, return home over the next 2 days).
- ScenicView automatically estimates direct drive time (no manual direct-drive input needed).
- Tune settings for:
  - **Scenicness** (more scenic emphasis)
  - **Stop time preference** (0-180 min per stop)
  - **Preferred stops** (1-100 input, capped to 10 exported stops due to Apple/Google Maps waypoint limits)
- Optional include filters for:
  - Drive-through highlights
  - Visit-worthy stops
  - Restaurants/food spots
  - Parks/recreation areas
- Uses multiple POI sources:
  - OpenStreetMap/Overpass (restaurants, parks, attractions, viewpoints, historic and natural places)
  - Wikipedia geosearch landmarks
  - Curated fallback scenic catalog (national parks, scenic viewpoints, recreation areas, etc.)
- Uses retry + timeout handling to reduce transient network errors when building routes.
- Adds rich stop descriptions (what the place is, what it is near, and suggested dwell time).
- Models stop duration by location type (viewpoint vs park vs campground vs town/food) and plans stops against the full depart→arrive time budget (one-way or split outbound/return windows for round trips).
- Exports routes to:
  - **Google Maps** (multi-waypoint directions)
  - **Apple Maps** (iPhone-friendly)

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Deploy as a hosted web app

Because this is static HTML/CSS/JS, you can host it on Netlify, Vercel, Cloudflare Pages, GitHub Pages, or any static host.

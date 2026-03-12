# scenicview

ScenicView is a lightweight hosted-web-app-ready route planner for people who want to **arrive by a specific time** while using their extra time on a more scenic drive.

## What it does

- Enter origin, destination, arrival time, and direct-drive estimate.
- Tune settings for:
  - **Scenicness** (higher = larger off-route detours)
  - **Stop time preference** (short pass-throughs vs longer stops)
  - **POI density** (fewer vs more points of interest)
- Includes toggles for:
  - Drive-through scenic points
  - Visit-worthy stops
- Uses free geocoding + reverse geocoding to intentionally generate off-corridor scenic detours through nearby cities/areas, not just direct-route points.
- Exports routes to:
  - **Google Maps** (multi-waypoint directions)
  - **Apple Maps** (works well for iPhone users)

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Deploy as a hosted web app

Because this is static HTML/CSS/JS, you can host it on Netlify, Vercel, Cloudflare Pages, GitHub Pages, or any static host.

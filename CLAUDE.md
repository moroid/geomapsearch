# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GeoMapSearch is a vanilla JavaScript web application for searching and viewing geological maps from Japan's AIST (産総研地質調査総合センター). It uses Leaflet.js for interactive mapping and queries the CKAN API for geological map metadata.

## Development Commands

**Run locally** (no build step required):
```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx http-server
```
Then open http://localhost:8000 in browser.

**Deployment**: Automatic via GitHub Actions on push to `main` branch (static site to GitHub Pages).

## Architecture

The application uses ES6 modules with clear separation of concerns:

```
js/
├── main.js      # Entry point, event initialization
├── config.js    # API endpoints (CKAN, seamless map tiles)
├── state.js     # Global state management with getter/setter pattern
├── mapCore.js   # Leaflet map initialization
├── search.js    # CKAN API integration, result categorization
├── layers.js    # Tile layer management, opacity controls
├── legend.js    # Legend display with zoom/pan functionality
└── utils.js     # Helper functions (bounds checking, HTML escaping)
```

**Key patterns**:
- State changes go through `state.js` functions (e.g., `setMap()`, `getActiveLayers()`)
- Global functions exposed on `window` for inline HTML onclick handlers
- All modules loaded via `<script type="module" src="js/main.js">`

## External APIs

| API | Base URL | Purpose |
|-----|----------|---------|
| CKAN | `https://data.gsj.jp/gkan/api/3/action` | Geological map metadata search |
| Seamless Tiles | `https://gbank.gsj.jp/seamless/v2/api/1.3/tiles/{z}/{y}/{x}.png` | 20万分の1シームレス地質図 |
| Seamless Legend | `https://gbank.gsj.jp/seamless/v2/api/1.3/legend.json` | Legend data for visible area |

## Key Entry Points for Modifications

- **Search logic**: [search.js](js/search.js) - `fetchGeologicalMaps()`, `categorizeResults()`
- **Map interaction**: [mapCore.js](js/mapCore.js) - `initMap()`, `showBoundsPreview()`
- **Layer UI**: [layers.js](js/layers.js) - `updateActiveLayersList()`, `toggleMapLayer()`
- **Legend display**: [legend.js](js/legend.js) - `showLegend()`, image zoom controls
- **Styling**: [style.css](style.css) - responsive layout with sidebar and legend panel

## Tech Stack

- Leaflet.js (in `libs/leaflet/`)
- Font Awesome (in `libs/fontawesome/`)
- OpenStreetMap + 国土地理院タイル for base maps
- No build tools, no package manager - pure vanilla JavaScript

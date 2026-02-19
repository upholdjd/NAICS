# NAICS Static REST API

A free, static JSON API for 2,404 NAICS classification codes, served via GitHub Pages. No server, no database, no API keys.

**Live API:** https://upholdjd.github.io/NAICS/

**Base URL:** `https://upholdjd.github.io/NAICS/api/v1/`

## Endpoints

| Endpoint | Description |
|---|---|
| [`codes.json`](https://upholdjd.github.io/NAICS/api/v1/codes.json) | All 2,404 codes (summary) |
| [`codes-full.json`](https://upholdjd.github.io/NAICS/api/v1/codes-full.json) | All 2,404 codes (full records) |
| [`stats.json`](https://upholdjd.github.io/NAICS/api/v1/stats.json) | Dataset statistics |
| [`naics/{code}.json`](https://upholdjd.github.io/NAICS/api/v1/naics/51.json) | Individual code with children + breadcrumb ancestry |
| [`children/{code}.json`](https://upholdjd.github.io/NAICS/api/v1/children/51.json) | Direct children of a code |
| [`level/{slug}.json`](https://upholdjd.github.io/NAICS/api/v1/level/sector.json) | Codes at a level (`sector`, `subsector`, `industry-group`, `industry`, `us-industry`) |
| [`sector/{code}.json`](https://upholdjd.github.io/NAICS/api/v1/sector/51.json) | All codes in a sector |
| [`sector/{code}/tree.json`](https://upholdjd.github.io/NAICS/api/v1/sector/51/tree.json) | Hierarchical tree for a sector |
| [`tree.json`](https://upholdjd.github.io/NAICS/api/v1/tree.json) | Full hierarchical tree |
| [`mini/codes.json`](https://upholdjd.github.io/NAICS/api/v1/mini/codes.json) | All NAICS_Mini records |
| [`mini/{code}.json`](https://upholdjd.github.io/NAICS/api/v1/mini/51.json) | Individual mini record |
| [`search-index.json`](https://upholdjd.github.io/NAICS/api/v1/search-index.json) | Compact index for client-side search (`c`, `n`, `s`, `u`) |
| [`search-config.json`](https://upholdjd.github.io/NAICS/api/v1/search-config.json) | JSON request template for live lookup on NAICS.com |

## Quick Start

```js
const BASE = 'https://upholdjd.github.io/NAICS/api/v1';

const res = await fetch(`${BASE}/naics/517311.json`);
const { data } = await res.json();

console.log(data.formal_name);  // "Wired Telecommunications Carriers"
console.log(data.breadcrumb);   // ancestry chain
console.log(data.children);     // direct children
console.log(data.lookup);       // external lookup URLs
```

## Response Format

Every endpoint returns a consistent envelope:

```json
{
  "meta": {
    "version": "1.0.0",
    "generated": "2026-02-18T00:00:00.000Z",
    "source": "https://github.com/upholdjd/NAICS",
    "endpoint": "/naics/51.json"
  },
  "data": { ... }
}
```

### Live Search JSON Call Template

Use `search-config.json` for an API-ready request template:

```js
const BASE = 'https://upholdjd.github.io/NAICS/api/v1';
const { data: cfg } = await (await fetch(`${BASE}/search-config.json`)).json();

const query = 'software';
const body = cfg.json_call.body_template.replace('{query}', encodeURIComponent(query));

const res = await fetch(cfg.json_call.url, {
  method: cfg.json_call.method,
  headers: cfg.json_call.headers,
  body,
});
const json = await res.json();
```

## Notes

- NAICS codes are **strings** (leading zeros preserved, e.g., `"09"`)
- CORS is enabled by default on GitHub Pages
- ~6,100 static JSON files, auto-deployed via GitHub Actions on data changes
- No authentication required

## Local Build

```bash
node scripts/build-api.js
# Output: dist/
```

## License

Public domain data. Code in this repository is MIT licensed.

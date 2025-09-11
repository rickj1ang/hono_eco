# Hono Economic Calendar (Cloudflare Workers)

A Cloudflare Workers API (Hono) that scrapes Investing.com’s economic calendar and returns structured events.

## What this repo does

- Exposes HTTP endpoints via Hono on Cloudflare Workers
- Calls Investing.com (session bootstrap + filtered POST) and paginates through results
- Parses the returned HTML into JSON events
- Cleans non-breaking spaces and nested markup
- Returns a simplified event shape tuned for programmatic use

## High-level architecture

- Entry: `src/index.ts`
- Routes: `src/routes/*`
  - `health.ts`: `GET /health`
  - `calendar.ts`: `GET /economic-calendar`
- Service: `src/services/investing.ts`
  - Session init, headers, `URLSearchParams`, pagination via `limit_from`, aggregate HTML
- Parser lib: `src/lib/parser.ts`
  - `parseEconomicCalendar(html)`: HTML → `EconomicEvent[]`
  - `stripTags()` / `cleanHtmlLight()` for fast cleaning

Directory snapshot
```
src/
  index.ts                // mounts routes
  routes/
    health.ts             // /health
    calendar.ts           // /economic-calendar
  services/
    investing.ts          // fetch + pagination (HTML accumulation)
  lib/
    parser.ts             // HTML → events, cleaners
wrangler.toml             // main = src/index.ts
```

## Data model (response)

```json
{
  "success": true,
  "count": 96,
  "from_date": "01/12/2024",
  "to_date": "31/01/2025",
  "timezone": "GMT",
  "events": [
    {
      "id": "511639",
      "timestamp": 1733137200,
      "event": "ISM Manufacturing PMI (Nov)",
      "actual": "48.4",
      "forecast": "47.7",
      "previous": "46.5"
    }
  ]
}
```

Notes:
- `timestamp` is UTC seconds. Prefer `data-event-datetime`; fallback to day-header epoch.
- `actual/forecast/previous` may be empty for holidays or if upstream lacks values.

## API endpoints

- `GET /` → metadata
- `GET /health` → `{ status: 'OK', timestamp }`
- `GET /economic-calendar?from_date=DD/MM/YYYY&to_date=DD/MM/YYYY`
  - Filters applied: USA (`country[]=5`), high importance (`importance[]=3`), timezone UTC (`timeZone=0`)
  - Pagination: iterates `limit_from` until last id repeats or no rows

Examples
```bash
curl "http://localhost:8787/health"
curl "http://localhost:8787/economic-calendar?from_date=01/12/2024&to_date=31/01/2025"
```

## Run locally

Prereqs: Node 18+ (or Bun), Cloudflare Wrangler.

```bash
npm install
npm run dev
# or
bun run dev
```

Local URL: http://localhost:8787

## Deploy

```bash
npm run deploy
# or
bun run deploy
```

Wrangler config (`wrangler.toml`) points `main` to `src/index.ts`.

## Coding guidelines (for agents & contributors)

- Routing
  - Add a sub-router in `src/routes/<feature>.ts` and export a `Hono` instance
  - Mount in `src/index.ts` via `app.route('/path', router)`
- Services
  - Keep remote calls and pagination in `src/services`
  - Routes should validate inputs and shape responses only
- Parsing & cleaning
  - Keep HTML parsing in `src/lib/parser.ts`
  - Use `stripTags()` + `cleanHtmlLight()`; avoid heavyweight HTML decoders
  - For table cells, capture `([\s\S]*?)` then strip tags
- Time handling
  - Always output a UTC `timestamp` (seconds)
- Pagination policy
  - Iterate pages with `limit_from`; stop on repeated last id, `rows_num == 0`, or empty HTML; cap pages with `maxPages`
- TypeScript
  - Use simple domain types (e.g., `EconomicEvent`)
  - Guard optional values with `?.`, `??`, and length checks
- Errors
  - Return 400 for validation, 500 for unhandled exceptions

## Extending the API

- Add `/economic-calendar/raw` to return upstream HTML for diagnostics (new route + service reuse)
- Add query params (countries, importance) by passing through to service’s `URLSearchParams`

## License

MIT
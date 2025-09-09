# Hono Economic Calendar API

A Cloudflare Workers API built with Hono that provides economic calendar data from Investing.com.

## Features

- Get economic calendar events for specific date ranges
- Filter for high-importance US events only
- RESTful API with JSON responses
- Built for Cloudflare Workers

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Cloudflare account (for deployment)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Test locally:
```bash
npm run dev
```

3. Deploy to Cloudflare Workers:
```bash
npm run deploy
```

## API Endpoints

### GET /

Returns API information and available endpoints.

### GET /health

Health check endpoint.

### GET /economic-calendar

Get economic calendar events.

**Parameters:**
- `from_date` (required): Start date in DD/MM/YYYY format
- `to_date` (required): End date in DD/MM/YYYY format

**Example:**
```
GET /economic-calendar?from_date=01/01/2024&to_date=31/01/2024
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "from_date": "01/01/2024",
  "to_date": "31/01/2024",
  "timezone": "GMT",
  "importance": "High",
  "country": "United States",
  "events": [
    {
      "id": "12345",
      "date": "1640995200",
      "time": "14:30",
      "currency": "USD",
      "importance": "High",
      "event": "Non-Farm Payrolls",
      "actual": "200K",
      "forecast": "195K",
      "previous": "199K"
    }
  ]
}
```

## Development

The project uses:
- [Hono](https://hono.dev/) - Web framework
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) - Cloudflare Workers CLI

## License

MIT
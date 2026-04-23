# AGMARKNET Agricultural Market Dashboard

Production-ready Node.js + Express dashboard that:

- Fetches `marketwise_price_arrival` data from AGMARKNET
- Stores daily snapshots in Supabase Postgres
- Serves frontend through backend proxy (no browser CORS issues)
- Runs scheduled daily updates with `node-cron`
- Exposes REST API endpoint `GET /api/seeds`
- Displays responsive table + Chart.js visualizations

## Architecture (MVC)

- **Model**: `src/models/seedsModel.js` (Postgres table init + queries/upserts)
- **View**: `public/index.html`, `public/styles.css`, `public/app.js`
- **Controller**: `src/controllers/seedsController.js`
- **Services**: AGMARKNET fetch + data sync orchestration
- **Routes**: `src/routes/seedsRoutes.js`
- **Jobs**: `src/jobs/dailySyncJob.js`

## Project Structure

```text
.
├── public
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── src
│   ├── app.js
│   ├── config
│   │   ├── agmarknetConfig.js
│   │   └── database.js
│   ├── controllers
│   │   └── seedsController.js
│   ├── jobs
│   │   └── dailySyncJob.js
│   ├── middleware
│   │   └── errorHandler.js
│   ├── models
│   │   └── seedsModel.js
│   ├── routes
│   │   └── seedsRoutes.js
│   └── services
│       ├── agmarknetService.js
│       └── seedsSyncService.js
├── .env.example
├── package.json
└── server.js
```

## Environment Setup

1. Copy env file:

   ```bash
   copy .env.example .env
   ```

2. Add your Supabase credentials in `.env`:

  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

3. Create table in Supabase SQL Editor:

  - Run [supabase/create_table.sql](supabase/create_table.sql)

## Install & Run

```bash
npm install
npm run dev
```

Production mode:

```bash
set NODE_ENV=production
npm start
```

## Live Market Page URL

- Live Server URL:

  ```text
  http://127.0.0.1:5500/live-market%20(1).html
  ```

- You can navigate to this page from any other HTML page with:

  ```html
  <a href="http://127.0.0.1:5500/live-market%20(1).html">Live Market</a>
  ```

- If both pages are served from the same Live Server root, use a relative link:

  ```html
  <a href="/live-market%20(1).html">Live Market</a>
  ```

- Recommended cleanup: rename file to `live-market.html` and use:

  ```html
  <a href="/live-market.html">Live Market</a>
  ```

## API Endpoints

- `GET /api/seeds`
  - Default: reads requested day from Supabase Postgres
  - If no rows for date, fetches AGMARKNET, stores, returns data
  - If AGMARKNET fails, serves latest cached Supabase rows with `stale: true`
- `GET /api/seeds?refresh=true`
  - Forces live pull + DB update for selected date
- `POST /api/seeds/sync`
  - Manual sync trigger (body optional: `{ "date": "YYYY-MM-DD" }`)
- `GET /health`

## Scheduler

- Uses `node-cron` expression from `CRON_SCHEDULE`
- Default: `0 2 * * *` (daily at 2 AM)
- Timezone from `CRON_TIMEZONE` (default `Asia/Kolkata`)

## Graceful Failure Strategy

- AGMARKNET API failures are caught and logged.
- `/api/seeds` returns latest cached DB data if live fetch fails.
- If no cached data exists, API returns proper error payload.

## Deployment Instructions

### Option 1: VPS / VM (recommended)

1. Install Node.js 20+.
2. Clone project and run `npm install`.
3. Create `.env` with production values from Supabase.
4. Run the SQL in [supabase/create_table.sql](supabase/create_table.sql) once.
5. Start with PM2:

   ```bash
   npm install -g pm2
   pm2 start server.js --name agri-dashboard
   pm2 save
   ```

6. Put Nginx in front as reverse proxy to `localhost:5000`.

### Option 2: Docker (manual)

- Package app into Node container and connect to managed Supabase Postgres.
- Set env vars via container runtime.
- Expose port `5000`.

## Notes

- AGMARKNET outbound headers are set in backend service:
  - `Origin: https://agmarknet.gov.in`
  - `Referer: https://agmarknet.gov.in/`
- Frontend calls relative path `/api/seeds`, so browser never calls AGMARKNET directly.

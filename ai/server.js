const app = require('./src/app');
const { initializeSeedsTable } = require('./src/models/seedsModel');
const { startDailySyncJob } = require('./src/jobs/dailySyncJob');
const { syncSeedsForDate } = require('./src/services/seedsSyncService');
const { getTodayIsoDate } = require('./src/config/agmarknetConfig');

const PORT = process.env.PORT || 5000;

const bootstrap = async () => {
  try {
    await initializeSeedsTable();
    console.log('[DB] Seeds table is ready');

    if (process.env.RUN_STARTUP_SYNC === 'true') {
      const startupDate = getTodayIsoDate();

      try {
        const result = await syncSeedsForDate(startupDate);
        console.log(`[SYNC] Startup sync completed (${result.count} rows for ${startupDate})`);
      } catch (error) {
        console.error('[SYNC] Startup sync failed:', error.message);
      }
    }

    startDailySyncJob();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Fatal startup error:', error);
    process.exit(1);
  }
};

bootstrap();

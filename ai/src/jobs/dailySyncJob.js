const cron = require('node-cron');
const { syncSeedsForDate } = require('../services/seedsSyncService');

const getTodayIsoDate = () => new Date().toISOString().slice(0, 10);

let cronTask;

const startDailySyncJob = () => {
  const schedule = process.env.CRON_SCHEDULE || '0 2 * * *';

  if (!cron.validate(schedule)) {
    throw new Error(`Invalid CRON_SCHEDULE: ${schedule}`);
  }

  cronTask = cron.schedule(
    schedule,
    async () => {
      const date = getTodayIsoDate();

      try {
        const result = await syncSeedsForDate(date);
        console.log(`[CRON] Synced ${result.count} records for ${date}`);
      } catch (error) {
        console.error('[CRON] Daily sync failed:', error.message);
      }
    },
    {
      timezone: process.env.CRON_TIMEZONE || 'Asia/Kolkata'
    }
  );

  console.log(`[CRON] Daily sync scheduled with expression: ${schedule}`);
};

const stopDailySyncJob = () => {
  if (cronTask) {
    cronTask.stop();
  }
};

module.exports = {
  startDailySyncJob,
  stopDailySyncJob,
  getTodayIsoDate
};

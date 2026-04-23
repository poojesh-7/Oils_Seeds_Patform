const {
  upsertSeedsRows,
  findSeedsByDate,
  findLatestSeeds
} = require('../models/seedsModel');
const { fetchSeedsData } = require('./agmarknetService');

const syncSeedsForDate = async (targetDate) => {
  const fetched = await fetchSeedsData(targetDate);

  await upsertSeedsRows(targetDate, fetched.normalizedRows);

  return {
    date: targetDate,
    count: fetched.normalizedRows.length,
    rows: fetched.normalizedRows,
    rawData: fetched.rawData
  };
};

const getSeedsFromDatabase = async (targetDate, limit) => {
  return findSeedsByDate(targetDate, limit);
};

const getLatestSeedsFromDatabase = async (limit) => {
  return findLatestSeeds(limit);
};

module.exports = {
  syncSeedsForDate,
  getSeedsFromDatabase,
  getLatestSeedsFromDatabase
};

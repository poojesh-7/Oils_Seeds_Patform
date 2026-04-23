const {
  syncSeedsForDate,
  getSeedsFromDatabase,
  getLatestSeedsFromDatabase
} = require('../services/seedsSyncService');
const { getTodayIsoDate } = require('../config/agmarknetConfig');

const toHeadingShape = (row) => {
  let raw = row?.raw_json || {};

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch (error) {
      raw = {};
    }
  }

  const commodityGroup =
    row?.commodity_group ||
    raw?.commodity_group ||
    raw?.commodity_group_name ||
    raw?.group_name ||
    raw?.group ||
    raw?.cmdt_grp_name ||
    'Unknown';

  const commodity =
    row?.commodity ||
    row?.commodity_name ||
    raw?.commodity_name ||
    raw?.commodity ||
    raw?.cmdt_name ||
    'Unknown';

  const msp = row?.msp_2026_27 ?? row?.msp ?? raw?.msp ?? raw?.MSP ?? raw?.msp_price ?? null;

  return {
    commodity_group: commodityGroup,
    commodity,
    msp_2026_27: msp
  };
};

const getSeedsData = async (req, res, next) => {
  try {
    const targetDate = req.query.date || getTodayIsoDate();
    const forceRefresh = req.query.refresh === 'true';
    const limit = Number(req.query.limit) || 50;

    if (forceRefresh) {
      const synced = await syncSeedsForDate(targetDate);
      return res.status(200).json({
        success: true,
        source: 'agmarknet-live',
        stale: false,
        date: synced.date,
        count: synced.rows.length,
        data: synced.rows.map(toHeadingShape)
      });
    }

    const dbRows = await getSeedsFromDatabase(targetDate, limit);

    if (dbRows.length > 0) {
      return res.status(200).json({
        success: true,
        source: 'supabase-cache',
        stale: false,
        date: targetDate,
        count: dbRows.length,
        data: dbRows.map(toHeadingShape)
      });
    }

    try {
      const synced = await syncSeedsForDate(targetDate);

      return res.status(200).json({
        success: true,
        source: 'agmarknet-live',
        stale: false,
        date: synced.date,
        count: synced.rows.length,
        data: synced.rows.map(toHeadingShape)
      });
    } catch (apiError) {
      const latest = await getLatestSeedsFromDatabase(limit);

      if (latest.rows.length > 0) {
        return res.status(200).json({
          success: true,
          source: 'supabase-cache-latest',
          stale: true,
          date: latest.date,
          count: latest.rows.length,
          warning: 'Live API unavailable. Serving latest stored dataset.',
          data: latest.rows.map(toHeadingShape)
        });
      }

      apiError.statusCode = apiError.statusCode || 502;
      throw apiError;
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSeedsData
};

const { getSupabaseClient } = require('../config/database');

const TABLE_NAME = 'seeds_market_data';

const initializeSeedsTable = async () => {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from(TABLE_NAME).select('id').limit(1);

  if (error) {
    throw new Error(
      `Supabase table check failed: ${error.message}. Run supabase/create_table.sql in Supabase SQL Editor.`
    );
  }
};

const upsertSeedsRows = async (recordDate, rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  const supabase = getSupabaseClient();
  const payload = rows.map((row) => ({
    record_date: recordDate,
    commodity_name: row.commodity_name,
    msp: row.msp,
    prices: row.prices,
    arrival_quantity: row.arrival_quantity,
    data_hash: row.data_hash,
    raw_json: row.raw_json,
    source: 'agmarknet'
  }));

  const { error } = await supabase.from(TABLE_NAME).upsert(payload, {
    onConflict: 'data_hash'
  });

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }

  return payload.length;
};

const findSeedsByDate = async (recordDate, limit = 50) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(
      'id, record_date, commodity_name, msp, prices, arrival_quantity, raw_json, source, created_at, updated_at'
    )
    .eq('record_date', recordDate)
    .order('id', { ascending: false })
    .limit(Number(limit));

  if (error) {
    throw new Error(`Supabase read by date failed: ${error.message}`);
  }

  return data || [];
};

const findLatestSeeds = async (limit = 50) => {
  const supabase = getSupabaseClient();

  const { data: latestDateRows, error } = await supabase
    .from(TABLE_NAME)
    .select('record_date')
    .order('record_date', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Supabase latest date lookup failed: ${error.message}`);
  }

  if (!latestDateRows.length) {
    return { date: null, rows: [] };
  }

  const latestDate = String(latestDateRows[0].record_date).slice(0, 10);
  const rows = await findSeedsByDate(latestDate, limit);

  return {
    date: latestDate,
    rows
  };
};

module.exports = {
  initializeSeedsTable,
  upsertSeedsRows,
  findSeedsByDate,
  findLatestSeeds
};

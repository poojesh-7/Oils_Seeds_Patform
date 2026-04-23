const getTodayIsoDate = () => new Date().toISOString().slice(0, 10);

const getDashboardParams = (targetDate = getTodayIsoDate()) => ({
  dashboard: process.env.AGMARKNET_DASHBOARD || 'marketwise_price_arrival',
  date: targetDate,
  group: process.env.AGMARKNET_GROUP || '[3]',
  commodity: process.env.AGMARKNET_COMMODITY || '[100001]',
  variety: process.env.AGMARKNET_VARIETY || '100021',
  state: process.env.AGMARKNET_STATE || '100006',
  district: process.env.AGMARKNET_DISTRICT || '[100007]',
  market: process.env.AGMARKNET_MARKET || '[100009]',
  grades: process.env.AGMARKNET_GRADES || '[4]',
  limit: process.env.AGMARKNET_LIMIT || '10',
  format: process.env.AGMARKNET_FORMAT || 'json'
});

module.exports = {
  baseUrl: process.env.AGMARKNET_BASE_URL || 'https://api.agmarknet.gov.in/v1/dashboard-data/',
  timeout: Number(process.env.REQUEST_TIMEOUT_MS) || 15000,
  getDashboardParams,
  getTodayIsoDate
};

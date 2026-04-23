const axios = require('axios');
const crypto = require('crypto');
const { baseUrl, timeout, getDashboardParams } = require('../config/agmarknetConfig');

const agmarknetClient = axios.create({
  baseURL: baseUrl,
  timeout,
  headers: {
    Origin: 'https://agmarknet.gov.in',
    Referer: 'https://agmarknet.gov.in/'
  }
});

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getFirstAvailable = (item, keys, fallback = null) => {
  for (const key of keys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
      return item[key];
    }
  }

  return fallback;
};

const normalizeRows = (rawData) => {
  const possibleRows = [
    rawData?.data?.records,
    rawData?.data,
    rawData?.data?.data,
    rawData?.result,
    rawData
  ].find((entry) => Array.isArray(entry));

  const rows = Array.isArray(possibleRows) ? possibleRows : [];

  return rows.map((item) => {
    const commodityGroup = String(
      getFirstAvailable(
        item,
        ['commodity_group', 'commodity_group_name', 'group_name', 'group', 'cmdt_grp_name'],
        'Unknown'
      )
    );

    const commodity = String(
      getFirstAvailable(item, ['commodity_name', 'commodity', 'commodityName', 'cmdt_name'], 'Unknown')
    );

    const mspValue = toNumberOrNull(getFirstAvailable(item, ['msp', 'MSP', 'msp_price']));

    const normalized = {
      commodity_group: commodityGroup,
      commodity,
      msp_2026_27: mspValue,
      commodity_name: commodity,
      msp: mspValue,
      prices: null,
      arrival_quantity: null,
      raw_json: item
    };

    normalized.data_hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(normalized.raw_json))
      .digest('hex');

    return normalized;
  });
};

const fetchSeedsData = async (targetDate) => {
  try {
    const response = await agmarknetClient.get('/', {
      params: getDashboardParams(targetDate)
    });

    return {
      rawData: response.data,
      normalizedRows: normalizeRows(response.data)
    };
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch AGMARKNET data';

    const wrappedError = new Error(errorMessage);
    wrappedError.statusCode = statusCode;
    wrappedError.details = error.response?.data || null;

    throw wrappedError;
  }
};

module.exports = {
  fetchSeedsData
};

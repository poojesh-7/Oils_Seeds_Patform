const LIVE_REFRESH_MS = 5 * 60 * 1000;

const tableBody = document.getElementById('marketPricesBody');
const lastUpdated = document.getElementById('lastUpdated');
const marketTrend = document.getElementById('marketTrend');
const totalVolume = document.getElementById('totalVolume');
const activeListings = document.getElementById('activeListings');
const activeTraders = document.getElementById('activeTraders');
const insightHeadline = document.getElementById('insightHeadline');
const insightSubline = document.getElementById('insightSubline');
const insightList = document.getElementById('insightList');

if (tableBody) {
  tableBody.innerHTML = '<tr><td colspan="6">Loading live market data...</td></tr>';
}

let rawOilseedChart;
let byproductChart;
let lastSuccessfulRows = [];
let supabaseClient;

const getApiBaseCandidates = () => {
  const candidates = [];

  if (window.LIVE_MARKET_API_BASE) {
    candidates.push(window.LIVE_MARKET_API_BASE.replace(/\/$/, ''));
  }

  if (window.location.protocol !== 'file:') {
    candidates.push(window.location.origin.replace(/\/$/, ''));
  }

  candidates.push('http://localhost:5000');

  return [...new Set(candidates)];
};

const getSupabaseClient = () => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = window.LIVE_MARKET_SUPABASE_URL || window.SUPABASE_URL;
  const supabaseAnonKey = window.LIVE_MARKET_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY;

  if (!window.supabase || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return supabaseClient;
};

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return 'N/A';
  }

  return `₹${amount.toLocaleString('en-IN')}`;
};

const getChangeClass = (value) => {
  if (value > 0) {
    return { cls: 'badge-success', icon: 'up' };
  }

  if (value < 0) {
    return { cls: 'badge-danger', icon: 'down' };
  }

  return { cls: 'badge-secondary', icon: 'minus' };
};

const normalizeSupabaseRows = (rows) => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => {
    const raw = row.raw_json || {};

    return {
      commodity_group:
        raw.cmdt_grp_name || raw.commodity_group || raw.commodity_group_name || 'Unknown',
      commodity: raw.cmdt_name || row.commodity_name || raw.commodity || 'Unknown',
      msp_2026_27: Number(row.msp ?? raw.msp_price ?? raw.msp ?? raw.MSP ?? 0)
    };
  });
};

const getAnalytics = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      avgMsp: 0,
      maxMsp: 0,
      minMsp: 0,
      topRows: [],
      byGroup: {},
      spread: 0,
      volatilityCv: 0,
      topCommodity: null,
      top3Share: 0,
      aboveAverageCount: 0,
      belowAverageCount: 0
    };
  }

  const values = rows.map((row) => Number(row.msp_2026_27) || 0);
  const total = values.reduce((sum, value) => sum + value, 0);
  const avgMsp = total / values.length;
  const maxMsp = Math.max(...values);
  const minMsp = Math.min(...values);
  const spread = maxMsp - minMsp;

  const topRows = [...rows]
    .sort((a, b) => (Number(b.msp_2026_27) || 0) - (Number(a.msp_2026_27) || 0))
    .slice(0, 8);

  const sortedRows = [...rows].sort((a, b) => (Number(b.msp_2026_27) || 0) - (Number(a.msp_2026_27) || 0));
  const topCommodity = sortedRows[0] || null;
  const top3Total = sortedRows.slice(0, 3).reduce((sum, row) => sum + (Number(row.msp_2026_27) || 0), 0);
  const top3Share = total > 0 ? (top3Total / total) * 100 : 0;

  const variance = values.reduce((sum, value) => sum + (value - avgMsp) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const volatilityCv = avgMsp > 0 ? (stdDev / avgMsp) * 100 : 0;

  const aboveAverageCount = rows.filter((row) => (Number(row.msp_2026_27) || 0) >= avgMsp).length;
  const belowAverageCount = rows.length - aboveAverageCount;

  const byGroup = rows.reduce((acc, row) => {
    const group = row.commodity_group || 'Other';
    const msp = Number(row.msp_2026_27) || 0;

    if (!acc[group]) {
      acc[group] = { total: 0, count: 0 };
    }

    acc[group].total += msp;
    acc[group].count += 1;

    return acc;
  }, {});

  return {
    avgMsp,
    maxMsp,
    minMsp,
    topRows,
    byGroup,
    spread,
    volatilityCv,
    topCommodity,
    top3Share,
    aboveAverageCount,
    belowAverageCount
  };
};

const renderTable = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6">No live records found.</td></tr>';
    return;
  }

  const analytics = getAnalytics(rows);
  const rankedRows = [...rows]
    .sort((a, b) => (Number(b.msp_2026_27) || 0) - (Number(a.msp_2026_27) || 0));

  tableBody.innerHTML = rankedRows
    .map((row, index) => {
      const msp = Number(row.msp_2026_27) || 0;
      const changePct = analytics.avgMsp > 0 ? ((msp - analytics.avgMsp) / analytics.avgMsp) * 100 : 0;
      const change = getChangeClass(changePct);
      const trendIcon = changePct >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';

      return `
        <tr>
          <td><strong>${row.commodity || 'N/A'}</strong></td>
          <td>${row.commodity_group || 'N/A'}</td>
          <td>${formatCurrency(msp)}</td>
          <td>
            <span class="badge ${change.cls}">
              <i class="fas fa-arrow-${change.icon}"></i>
              ${Math.abs(changePct).toFixed(1)}%
            </span>
          </td>
          <td>#${index + 1}</td>
          <td><i class="fas ${trendIcon}"></i></td>
        </tr>
      `;
    })
    .join('');
};

const renderStats = (rows, sourceLabel) => {
  if (!marketTrend || !totalVolume || !activeListings || !activeTraders) {
    return;
  }

  const analytics = getAnalytics(rows);

  marketTrend.textContent = formatCurrency(Math.round(analytics.avgMsp));
  totalVolume.textContent = formatCurrency(Math.round(analytics.maxMsp));
  activeListings.textContent = String(rows.length);
  activeTraders.textContent = `${analytics.volatilityCv.toFixed(1)}%`;
};

const renderInsights = (rows, sourceLabel) => {
  if (!insightHeadline || !insightSubline || !insightList) {
    return;
  }

  const analytics = getAnalytics(rows);

  if (!rows.length) {
    insightHeadline.textContent = 'No analytics available';
    insightSubline.textContent = 'No rows were returned for the latest market snapshot.';
    insightList.innerHTML = '';
    return;
  }

  const topName = analytics.topCommodity?.commodity || 'N/A';
  const topValue = Number(analytics.topCommodity?.msp_2026_27 || 0);

  insightHeadline.textContent = `Top MSP leader: ${topName} (${formatCurrency(Math.round(topValue))})`;
  insightSubline.textContent = `Spread ${formatCurrency(Math.round(analytics.spread))} across tracked commodities • Source: ${sourceLabel || 'supabase-direct'}`;

  const points = [
    `Top 3 commodities contribute ${analytics.top3Share.toFixed(1)}% of total MSP value.`,
    `${analytics.aboveAverageCount} commodities are at/above average MSP; ${analytics.belowAverageCount} are below average.`,
    `Market volatility coefficient is ${analytics.volatilityCv.toFixed(1)}% (lower means more stable pricing).`
  ];

  insightList.innerHTML = points.map((point) => `<li>${point}</li>`).join('');
};

const destroyCharts = () => {
  if (rawOilseedChart) {
    rawOilseedChart.destroy();
  }

  if (byproductChart) {
    byproductChart.destroy();
  }
};

const renderCharts = (rows) => {
  destroyCharts();

  const analytics = getAnalytics(rows);
  const safeTopRows = analytics.topRows.length > 0
    ? analytics.topRows
    : [{ commodity: 'No Data', commodity_group: 'N/A', msp_2026_27: 0 }];

  const labels = safeTopRows.map((row) => row.commodity || 'N/A');
  const values = safeTopRows.map((row) => Number(row.msp_2026_27) || 0);

  const rawCtx = document.getElementById('rawOilseedChart')?.getContext('2d');
  const byproductCtx = document.getElementById('byproductChart')?.getContext('2d');

  if (!rawCtx || !byproductCtx) {
    return;
  }

  rawOilseedChart = new Chart(rawCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'MSP (Rs./Quintal) 2026-27',
          data: values,
          borderColor: '#2d5016',
          backgroundColor: 'rgba(45, 80, 22, 0.35)',
          borderWidth: 1.5
        }
      ]
    },
    options: {
      responsive: true,
      indexAxis: 'y',
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        x: {
          ticks: {
            callback: (value) => `₹${Number(value).toLocaleString('en-IN')}`
          }
        }
      }
    }
  });

  const deviationRows = [...rows]
    .map((row) => {
      const msp = Number(row.msp_2026_27) || 0;
      const delta = msp - analytics.avgMsp;

      return {
        commodity: row.commodity || 'N/A',
        delta
      };
    })
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 10);

  const deviationLabels = deviationRows.map((row) => row.commodity);
  const deviationValues = deviationRows.map((row) => Math.round(row.delta));
  const deviationColors = deviationRows.map((row) => (row.delta >= 0 ? '#2d5016' : '#d97706'));

  byproductChart = new Chart(byproductCtx, {
    type: 'bar',
    data: {
      labels: deviationLabels,
      datasets: [
        {
          label: 'Deviation from Avg MSP',
          data: deviationValues,
          backgroundColor: deviationColors,
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          ticks: {
            callback: (value) => `${value >= 0 ? '+' : ''}₹${Number(value).toLocaleString('en-IN')}`
          }
        }
      },
      plugins: {
        legend: { position: 'top' }
      }
    }
  });
};

const fetchFromSupabaseDirect = async () => {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const { data: latestDateRows, error: dateError } = await client
    .from('seeds_market_data')
    .select('record_date')
    .order('record_date', { ascending: false })
    .limit(1);

  if (dateError) {
    throw new Error(`Supabase date query failed: ${dateError.message}`);
  }

  const latestDate = latestDateRows?.[0]?.record_date;
  if (!latestDate) {
    return {
      source: 'supabase-direct',
      data: []
    };
  }

  const { data, error } = await client
    .from('seeds_market_data')
    .select('commodity_name, msp, raw_json, record_date')
    .eq('record_date', latestDate)
    .order('id', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Supabase rows query failed: ${error.message}`);
  }

  return {
    source: 'supabase-direct',
    data: normalizeSupabaseRows(data)
  };
};

const fetchFromBackendApi = async (forceRefresh = false) => {
  const query = forceRefresh ? '?refresh=true' : '';

  for (const baseUrl of getApiBaseCandidates()) {
    try {
      const response = await fetch(`${baseUrl}/api/live-market/data${query}`);

      if (!response.ok) {
        continue;
      }

      return response.json();
    } catch (error) {
      continue;
    }
  }

  throw new Error('Failed to load live market data from backend API.');
};

const fetchLiveData = async (forceRefresh = false) => {
  try {
    const supabasePayload = await fetchFromSupabaseDirect();
    if (supabasePayload) {
      return supabasePayload;
    }
  } catch (error) {
    return fetchFromBackendApi(forceRefresh);
  }

  return fetchFromBackendApi(forceRefresh);
};

const updateLastUpdated = () => {
  if (lastUpdated) {
    lastUpdated.textContent = new Date().toLocaleTimeString();
  }
};

const renderError = (error) => {
  if (tableBody) {
    tableBody.innerHTML = `<tr><td colspan="6">${error.message || 'Failed to load live market data.'}</td></tr>`;
  }

  if (marketTrend) {
    marketTrend.textContent = 'N/A';
  }

  renderCharts(lastSuccessfulRows);
};

const refreshDashboard = async (forceRefresh = false) => {
  try {
    const payload = await fetchLiveData(forceRefresh);
    const rows = Array.isArray(payload.data) ? payload.data : [];
    lastSuccessfulRows = rows;

    renderTable(rows);
    renderStats(rows, payload.source);
    renderInsights(rows, payload.source);
    renderCharts(rows);
    updateLastUpdated();
  } catch (error) {
    renderError(error);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  refreshDashboard(true);
  setInterval(() => refreshDashboard(false), LIVE_REFRESH_MS);
});

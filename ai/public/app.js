const API_URL = '/api/seeds';
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const tableBody = document.getElementById('tableBody');
const spinner = document.getElementById('spinner');
const errorMessage = document.getElementById('errorMessage');
const warningMessage = document.getElementById('warningMessage');
const lastUpdated = document.getElementById('lastUpdated');
const dataSource = document.getElementById('dataSource');
const summaryCount = document.getElementById('summaryCount');
const summaryPrice = document.getElementById('summaryPrice');
const summaryArrivals = document.getElementById('summaryArrivals');

let priceChart;
let arrivalChart;

const showLoading = () => {
  spinner.classList.remove('hidden');
  errorMessage.classList.add('hidden');
  warningMessage.classList.add('hidden');
};

const showError = (message) => {
  spinner.classList.add('hidden');
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
  warningMessage.classList.add('hidden');
};

const hideStatus = () => {
  spinner.classList.add('hidden');
  errorMessage.classList.add('hidden');
};

const showWarning = (message) => {
  warningMessage.textContent = message;
  warningMessage.classList.remove('hidden');
};

const formatValue = (value, fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return value;
};

const getFirstAvailable = (obj, keys, fallback = 'N/A') => {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }

  return fallback;
};

const renderRows = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="3" class="empty-state">No records found.</td></tr>';
    return;
  }

  const html = rows
    .map((item) => {
      const commodityGroup = getFirstAvailable(item, ['commodity_group', 'commodity_group_name', 'group_name']);
      const commodity = getFirstAvailable(item, ['commodity', 'commodity_name', 'commodityName']);
      const msp = getFirstAvailable(item, ['msp_2026_27', 'msp', 'MSP']);

      return `
        <tr>
          <td>${formatValue(commodityGroup)}</td>
          <td>${formatValue(commodity)}</td>
          <td>${formatValue(msp)}</td>
        </tr>
      `;
    })
    .join('');

  tableBody.innerHTML = html;
};

const normalizeRows = (rows) => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((item) => ({
    commodity_group: getFirstAvailable(item, ['commodity_group', 'commodity_group_name', 'group_name']),
    commodity: getFirstAvailable(item, ['commodity', 'commodity_name', 'commodityName']),
    msp_2026_27: Number(getFirstAvailable(item, ['msp_2026_27', 'msp', 'MSP'], 0)) || 0
  }));
};

const renderSummary = (rows) => {
  const totalRecords = rows.length;
  const totalMsp = rows.reduce((sum, row) => sum + row.msp_2026_27, 0);
  const averageMsp = totalRecords > 0 ? totalMsp / totalRecords : 0;
  const maxMsp = rows.reduce((max, row) => Math.max(max, row.msp_2026_27), 0);

  summaryCount.textContent = String(totalRecords);
  summaryArrivals.textContent = maxMsp.toLocaleString();
  summaryPrice.textContent = averageMsp.toFixed(2);
};

const destroyCharts = () => {
  if (priceChart) {
    priceChart.destroy();
  }

  if (arrivalChart) {
    arrivalChart.destroy();
  }
};

const renderCharts = (rows) => {
  const labels = rows.map((row, index) => row.commodity || `Item ${index + 1}`);
  const mspValues = rows.map((row) => row.msp_2026_27 || 0);

  const sortedTop = [...rows]
    .sort((a, b) => (b.msp_2026_27 || 0) - (a.msp_2026_27 || 0))
    .slice(0, 10);

  const topLabels = sortedTop.map((row, index) => row.commodity || `Top ${index + 1}`);
  const topMspValues = sortedTop.map((row) => row.msp_2026_27 || 0);

  destroyCharts();

  const priceCtx = document.getElementById('priceChart');
  const arrivalCtx = document.getElementById('arrivalChart');

  priceChart = new Chart(priceCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'MSP (Rs./Quintal)',
          data: mspValues,
          backgroundColor: '#2563eb'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  arrivalChart = new Chart(arrivalCtx, {
    type: 'line',
    data: {
      labels: topLabels,
      datasets: [
        {
          label: 'Top MSP',
          data: topMspValues,
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22, 163, 74, 0.2)',
          fill: true,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
};

const fetchAndRender = async () => {
  try {
    showLoading();

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const rows = normalizeRows(payload.data);

    renderRows(rows);
    renderSummary(rows);
    renderCharts(rows);
    hideStatus();

    if (payload.stale && payload.warning) {
      showWarning(payload.warning);
    }

    dataSource.textContent = `Source: ${payload.source || '--'}`;

    lastUpdated.textContent = `Last updated: ${new Date().toLocaleString()}`;
  } catch (error) {
    showError(error.message || 'Unable to load data at the moment.');
    tableBody.innerHTML = '<tr><td colspan="3" class="empty-state">Failed to load data.</td></tr>';
    dataSource.textContent = 'Source: unavailable';
  }
};

fetchAndRender();
setInterval(fetchAndRender, REFRESH_INTERVAL_MS);

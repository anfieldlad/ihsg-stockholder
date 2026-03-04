/* ══════════════════════════════════════
   IHSG Stockholder Dashboard - App Logic
   ══════════════════════════════════════ */

// ── Globals ──
let rawData = null;
let stockMap = {};   // code -> { issuer, holders: [...] }
let investorMap = {}; // investor -> { type, lf, stocks: [{code, pct, shares}] }
let priceMap = {};   // code -> { last_price, change_pct, ... }
let currentTab = 'stocks';
let stockPage = 1;
let investorPage = 1;
const PAGE_SIZE = 30;
let filteredStocks = [];
let filteredInvestors = [];
let stockSort = { key: 'code', asc: true };
let investorSort = { key: 'stockCount', asc: false };
let modalChart = null;

const TYPE_LABELS = {
  CP: 'Corporate', ID: 'Individual', IB: 'Inv. Bank', SC: 'Sekuritas',
  MF: 'Reksa Dana', IS: 'Asuransi', PF: 'Dana Pensiun', OT: 'Lainnya',
  FD: 'Foundation', YY: 'Yayasan'
};

const TYPE_COLORS = {
  CP: '#3b82f6', ID: '#8b5cf6', IB: '#f59e0b', SC: '#06b6d4',
  MF: '#10b981', IS: '#ec4899', PF: '#f97316', OT: '#64748b',
  FD: '#a78bfa', YY: '#34d399'
};

// ── Data Loading ──
async function loadData() {
  try {
    const res = await fetch('holder_data.json');
    rawData = await res.json();
    processData();
    renderUI();
  } catch (e) {
    document.getElementById('loadingState').innerHTML =
      '<p style="color:var(--accent-rose);">Gagal memuat data. Pastikan holder_data.json tersedia.</p>';
  }
}

function processData() {
  const items = rawData.items;

  // Build stock map
  stockMap = {};
  for (const item of items) {
    if (!stockMap[item.code]) {
      stockMap[item.code] = { issuer: item.issuer, holders: [] };
    }
    stockMap[item.code].holders.push(item);
  }

  // Build investor map
  investorMap = {};
  for (const item of items) {
    if (!investorMap[item.investor]) {
      investorMap[item.investor] = { type: item.investor_type, lf: item.local_foreign, stocks: [] };
    }
    investorMap[item.investor].stocks.push({
      code: item.code, pct: item.percentage, shares: item.shares
    });
  }
}

// ── Format Helpers ──
function fmtNum(n) {
  if (n == null) return '-';
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString('id-ID');
}

function fmtShares(n) {
  return n.toLocaleString('id-ID');
}

function fmtPrice(n) {
  if (n == null) return '-';
  return n.toLocaleString('id-ID');
}

function fmtChangePct(pct) {
  if (pct == null || pct === 0) return { text: '0.00%', cls: 'change-neutral' };
  const sign = pct > 0 ? '+' : '';
  const cls = pct > 0 ? 'change-positive' : 'change-negative';
  return { text: `${sign}${pct.toFixed(2)}%`, cls };
}

// ── Price Fetching ──
async function fetchPricesForPage(codes) {
  if (!codes.length) return;
  const codesStr = codes.join(',');
  try {
    const res = await fetch(`/api/prices?codes=${codesStr}`);
    const data = await res.json();
    if (data.prices) {
      Object.assign(priceMap, data.prices);
      updatePriceCells(codes);
    }
  } catch (e) {
    console.warn('Price fetch failed:', e);
  }
}

async function fetchSinglePrice(code) {
  if (priceMap[code] && priceMap[code].last_price != null) return priceMap[code];
  try {
    const res = await fetch(`/api/price/${code}`);
    const data = await res.json();
    priceMap[code] = data;
    return data;
  } catch (e) {
    console.warn('Price fetch failed for', code, e);
    return null;
  }
}

function updatePriceCells(codes) {
  for (const code of codes) {
    const priceEl = document.getElementById(`price-${code}`);
    const changeEl = document.getElementById(`change-${code}`);
    if (!priceEl || !changeEl) continue;

    const p = priceMap[code];
    if (p && p.last_price != null) {
      priceEl.innerHTML = `<span class="price-cell">${fmtPrice(p.last_price)}</span>`;
      const chg = fmtChangePct(p.change_pct);
      changeEl.innerHTML = `<span class="${chg.cls}">${chg.text}</span>`;
    } else {
      priceEl.innerHTML = '<span style="color:var(--text-muted);">-</span>';
      changeEl.innerHTML = '<span class="change-neutral">-</span>';
    }
  }
}

// ── Render UI ──
function renderUI() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';

  // Header
  document.getElementById('dataNote').textContent = `📋 Data kepemilikan statis sesuai data dari KSEI tanggal ${rawData.source_date_in_file}`;

  // Stats
  const codes = Object.keys(stockMap);
  const investors = Object.keys(investorMap);
  const totalRecords = rawData.items.length;
  let localCount = 0, foreignCount = 0;
  for (const item of rawData.items) {
    if (item.local_foreign === 'L') localCount++;
    else foreignCount++;
  }

  document.getElementById('statStocks').textContent = codes.length.toLocaleString('id-ID');
  document.getElementById('statInvestors').textContent = investors.length.toLocaleString('id-ID');
  document.getElementById('statRecords').textContent = totalRecords.toLocaleString('id-ID');
  document.getElementById('statRatio').textContent =
    `${Math.round(localCount / totalRecords * 100)}:${Math.round(foreignCount / totalRecords * 100)}`;
  document.getElementById('statRatioSub').textContent =
    `${localCount.toLocaleString('id-ID')} lokal · ${foreignCount.toLocaleString('id-ID')} asing`;

  updateStockTable();
  updateInvestorTable();
  renderCharts();
}

// ── Stock Table ──
function getStockRows() {
  const search = document.getElementById('globalSearch').value.toLowerCase();
  const filterType = document.getElementById('filterType').value;
  const filterLF = document.getElementById('filterLF').value;

  let rows = Object.entries(stockMap).map(([code, data]) => {
    let holders = data.holders;
    if (filterType) holders = holders.filter(h => h.investor_type === filterType);
    if (filterLF) holders = holders.filter(h => h.local_foreign === filterLF);

    if (holders.length === 0 && (filterType || filterLF)) return null;

    const topHolder = data.holders.reduce((a, b) => a.percentage > b.percentage ? a : b);
    const localShares = data.holders.filter(h => h.local_foreign === 'L').reduce((s, h) => s + h.percentage, 0);
    const allPct = data.holders.reduce((s, h) => s + h.percentage, 0);
    const localPct = allPct > 0 ? localShares : 0;

    const p = priceMap[code];
    const price = p ? p.last_price : null;
    const changePct = p ? p.change_pct : null;

    return {
      code, issuer: data.issuer,
      holders: data.holders.length,
      topPct: topHolder.percentage,
      topName: topHolder.investor,
      localPct: Math.round(localPct * 10) / 10,
      price: price || 0,
      changePct: changePct || 0,
    };
  }).filter(Boolean);

  if (search) {
    rows = rows.filter(r =>
      r.code.toLowerCase().includes(search) ||
      r.issuer.toLowerCase().includes(search) ||
      r.topName.toLowerCase().includes(search) ||
      stockMap[r.code].holders.some(h => h.investor.toLowerCase().includes(search))
    );
  }

  // Sort
  rows.sort((a, b) => {
    let va = a[stockSort.key], vb = b[stockSort.key];
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (va < vb) return stockSort.asc ? -1 : 1;
    if (va > vb) return stockSort.asc ? 1 : -1;
    return 0;
  });

  return rows;
}

function updateStockTable() {
  filteredStocks = getStockRows();
  const totalPages = Math.ceil(filteredStocks.length / PAGE_SIZE);
  if (stockPage > totalPages) stockPage = 1;
  const start = (stockPage - 1) * PAGE_SIZE;
  const page = filteredStocks.slice(start, start + PAGE_SIZE);

  const tbody = document.getElementById('stockTableBody');
  tbody.innerHTML = page.map(r => `
    <tr onclick="location.hash='#/stock/${r.code}'">
      <td class="code-cell">${r.code}</td>
      <td class="issuer-cell" title="${r.issuer}">${r.issuer}</td>
      <td id="price-${r.code}"><div class="price-loading"></div></td>
      <td id="change-${r.code}"><div class="price-loading" style="width:40px;"></div></td>
      <td><span class="inv-count">${r.holders}</span></td>
      <td>
        <div class="pct-bar">
          <div class="pct-bar-track"><div class="pct-bar-fill" style="width:${Math.min(r.topPct, 100)}%"></div></div>
          <span>${r.topPct}%</span>
        </div>
      </td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;" title="${r.topName}">${r.topName}</td>
      <td><span class="${r.localPct > 50 ? 'badge-local' : 'badge-foreign'}">${r.localPct}%</span></td>
    </tr>
  `).join('');

  renderPagination('stockPagination', stockPage, totalPages, p => { stockPage = p; updateStockTable(); });

  // Fetch prices for visible stocks
  const visibleCodes = page.map(r => r.code);
  const needsFetch = visibleCodes.filter(c => !priceMap[c] || priceMap[c].last_price == null);
  const alreadyCached = visibleCodes.filter(c => priceMap[c] && priceMap[c].last_price != null);

  // Immediately show cached prices
  if (alreadyCached.length > 0) {
    updatePriceCells(alreadyCached);
  }
  // Fetch uncached
  if (needsFetch.length > 0) {
    fetchPricesForPage(needsFetch);
  }
}

// ── Investor Table ──
function getInvestorRows() {
  const search = document.getElementById('globalSearch').value.toLowerCase();

  let rows = Object.entries(investorMap).map(([name, data]) => ({
    name, type: data.type, lf: data.lf,
    stockCount: data.stocks.length,
    stocks: data.stocks.map(s => s.code).join(', ')
  }));

  if (search) {
    rows = rows.filter(r =>
      r.name.toLowerCase().includes(search) ||
      r.stocks.toLowerCase().includes(search)
    );
  }

  rows.sort((a, b) => {
    let va = a[investorSort.key], vb = b[investorSort.key];
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (va < vb) return investorSort.asc ? -1 : 1;
    if (va > vb) return investorSort.asc ? 1 : -1;
    return 0;
  });

  return rows;
}

function updateInvestorTable() {
  filteredInvestors = getInvestorRows();
  const totalPages = Math.ceil(filteredInvestors.length / PAGE_SIZE);
  if (investorPage > totalPages) investorPage = 1;
  const start = (investorPage - 1) * PAGE_SIZE;
  const page = filteredInvestors.slice(start, start + PAGE_SIZE);

  const tbody = document.getElementById('investorTableBody');
  tbody.innerHTML = page.map((r, i) => {
    const stockList = r.stocks.length > 60 ? r.stocks.substring(0, 60) + '...' : r.stocks;
    const safeName = r.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const hash = '#/investor/' + encodeURIComponent(r.name);
    return `
    <tr onclick="location.hash='${hash}'">
      <td>${start + i + 1}</td>
      <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;color:var(--text-primary);font-weight:500;" title="${r.name}">${r.name}</td>
      <td><span class="badge-type" style="background:${TYPE_COLORS[r.type] || '#64748b'}22;color:${TYPE_COLORS[r.type] || '#64748b'}">${TYPE_LABELS[r.type] || r.type}</span></td>
      <td style="font-weight:700;color:var(--accent-amber);">${r.stockCount}</td>
      <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;font-size:12px;" title="${r.stocks}">${stockList}</td>
    </tr>`;
  }).join('');

  renderPagination('investorPagination', investorPage, totalPages, p => { investorPage = p; updateInvestorTable(); });
}

// ── Pagination ──
function renderPagination(containerId, current, total, onPage) {
  const container = document.getElementById(containerId);
  if (total <= 1) { container.innerHTML = ''; return; }

  let html = `<button class="page-btn" ${current === 1 ? 'disabled' : ''} onclick="void(0)">‹</button>`;

  let pages = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages = [1];
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
  }

  for (const p of pages) {
    if (p === '...') {
      html += `<span class="page-info">…</span>`;
    } else {
      html += `<button class="page-btn ${p === current ? 'active' : ''}" onclick="void(0)">${p}</button>`;
    }
  }
  html += `<button class="page-btn" ${current === total ? 'disabled' : ''} onclick="void(0)">›</button>`;
  html += `<span class="page-info">${current}/${total}</span>`;

  container.innerHTML = html;

  // Attach events
  const btns = container.querySelectorAll('.page-btn');
  btns[0].addEventListener('click', () => { if (current > 1) onPage(current - 1); });
  btns[btns.length - 1].addEventListener('click', () => { if (current < total) onPage(current + 1); });
  const pageBtns = Array.from(btns).slice(1, -1);
  pageBtns.forEach(btn => {
    if (!isNaN(parseInt(btn.textContent))) {
      btn.addEventListener('click', () => onPage(parseInt(btn.textContent)));
    }
  });
}

// ── Charts ──
function renderCharts() {
  // Type distribution
  const typeCounts = {};
  for (const item of rawData.items) {
    typeCounts[item.investor_type] = (typeCounts[item.investor_type] || 0) + 1;
  }
  const typeLabels = Object.keys(typeCounts).map(t => TYPE_LABELS[t] || t);
  const typeData = Object.values(typeCounts);
  const typeColors = Object.keys(typeCounts).map(t => TYPE_COLORS[t] || '#64748b');

  new Chart(document.getElementById('chartType'), {
    type: 'doughnut',
    data: {
      labels: typeLabels,
      datasets: [{ data: typeData, backgroundColor: typeColors, borderWidth: 0, hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 }, padding: 12, usePointStyle: true, pointStyleWidth: 10 }
        }
      },
      cutout: '65%'
    }
  });

  // Local vs Foreign
  let localC = 0, foreignC = 0;
  for (const item of rawData.items) {
    if (item.local_foreign === 'L') localC++; else foreignC++;
  }
  new Chart(document.getElementById('chartLF'), {
    type: 'doughnut',
    data: {
      labels: ['Lokal', 'Asing'],
      datasets: [{ data: [localC, foreignC], backgroundColor: ['#10b981', '#f43f5e'], borderWidth: 0, hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 }, padding: 12, usePointStyle: true, pointStyleWidth: 10 }
        }
      },
      cutout: '65%'
    }
  });

  // Top Holders chart
  const holderCounts = Object.entries(stockMap)
    .map(([code, d]) => ({ code, count: d.holders.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  new Chart(document.getElementById('chartTopHolders'), {
    type: 'bar',
    data: {
      labels: holderCounts.map(h => h.code),
      datasets: [{
        label: 'Jumlah Holder >1%',
        data: holderCounts.map(h => h.count),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { family: 'Inter' } } },
        y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'Inter', weight: 600, size: 12 } } }
      }
    }
  });

  // Concentration chart
  const concBuckets = { '90-100%': 0, '70-90%': 0, '50-70%': 0, '30-50%': 0, '<30%': 0 };
  for (const [code, d] of Object.entries(stockMap)) {
    const top = Math.max(...d.holders.map(h => h.percentage));
    if (top >= 90) concBuckets['90-100%']++;
    else if (top >= 70) concBuckets['70-90%']++;
    else if (top >= 50) concBuckets['50-70%']++;
    else if (top >= 30) concBuckets['30-50%']++;
    else concBuckets['<30%']++;
  }

  new Chart(document.getElementById('chartConcentration'), {
    type: 'bar',
    data: {
      labels: Object.keys(concBuckets),
      datasets: [{
        label: 'Jumlah Emiten',
        data: Object.values(concBuckets),
        backgroundColor: ['#f43f5e88', '#f59e0b88', '#3b82f688', '#10b98188', '#8b5cf688'],
        borderColor: ['#f43f5e', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'],
        borderWidth: 1,
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Konsentrasi Top Holder', color: '#94a3b8', font: { family: 'Inter', size: 13 } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'Inter', size: 12 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { family: 'Inter' } } }
      }
    }
  });
}

// ── Routing & Page Views ──
function handleHashChange() {
  const hash = window.location.hash;

  // Hide all views first
  document.querySelectorAll('.page-view').forEach(el => el.style.display = 'none');
  window.scrollTo(0, 0);

  if (hash.startsWith('#/stock/')) {
    const code = hash.split('#/stock/')[1];
    document.getElementById('stockView').style.display = 'block';
    renderStockPage(decodeURIComponent(code));
  } else if (hash.startsWith('#/investor/')) {
    const name = hash.split('#/investor/')[1];
    document.getElementById('investorView').style.display = 'block';
    renderInvestorPage(decodeURIComponent(name));
  } else {
    // Default: Dashboard
    document.getElementById('dashboardView').style.display = 'block';
    // Ensure charts resize correctly when returning to dashboard
    window.dispatchEvent(new Event('resize'));
  }
}

window.addEventListener('hashchange', handleHashChange);

// ── Stock Page ──
async function renderStockPage(code) {
  const data = stockMap[code];
  if (!data) {
    document.getElementById('modalTitle').innerHTML = 'Saham tidak ditemukan';
    document.getElementById('modalIssuer').textContent = '';
    document.getElementById('modalPriceRow').innerHTML = '';
    document.getElementById('modalStats').innerHTML = '';
    document.getElementById('modalTableBody').innerHTML = '';
    if (modalChart) { modalChart.destroy(); modalChart = null; }
    return;
  }

  document.getElementById('modalTitle').innerHTML = `<span class="code">${code}</span>`;
  document.getElementById('modalIssuer').textContent = data.issuer;

  // Price row (show loading, then fetch)
  const priceRow = document.getElementById('modalPriceRow');
  priceRow.innerHTML = '<div class="price-loading" style="width:120px;height:28px;"></div>';

  const totalShares = data.holders.reduce((s, h) => s + h.shares, 0);
  const totalPct = data.holders.reduce((s, h) => s + h.percentage, 0);
  const localPct = data.holders.filter(h => h.local_foreign === 'L').reduce((s, h) => s + h.percentage, 0);

  document.getElementById('modalStats').innerHTML = `
    <div class="modal-stat"><div class="label">Holder</div><div class="value">${data.holders.length}</div></div>
    <div class="modal-stat"><div class="label">Total Saham</div><div class="value" style="font-size:18px;">${fmtShares(totalShares)}</div></div>
    <div class="modal-stat"><div class="label">Total %</div><div class="value">${totalPct.toFixed(1)}%</div></div>
    <div class="modal-stat"><div class="label">Lokal %</div><div class="value" style="color:var(--accent-emerald)">${localPct.toFixed(1)}%</div></div>
  `;

  // Table
  const sorted = [...data.holders].sort((a, b) => b.percentage - a.percentage);
  document.getElementById('modalTableBody').innerHTML = sorted.map(h => `
    <tr>
      <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;color:var(--text-primary);font-weight:500;" title="${h.investor}">${h.investor}</td>
      <td><span class="badge-type" style="background:${TYPE_COLORS[h.investor_type] || '#64748b'}22;color:${TYPE_COLORS[h.investor_type] || '#64748b'}">${TYPE_LABELS[h.investor_type] || h.investor_type}</span></td>
      <td><span class="${h.local_foreign === 'L' ? 'badge-local' : 'badge-foreign'}">${h.local_foreign === 'L' ? 'Lokal' : 'Asing'}</span></td>
      <td>${fmtNum(h.shares)}</td>
      <td style="font-weight:700;">${h.percentage}%</td>
    </tr>
  `).join('');

  // Chart
  if (modalChart) modalChart.destroy();
  const topN = sorted.slice(0, 8);
  const otherPct = sorted.slice(8).reduce((s, h) => s + h.percentage, 0);
  const labels = topN.map(h => h.investor.length > 25 ? h.investor.substring(0, 25) + '...' : h.investor);
  const chartData = topN.map(h => h.percentage);
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#ec4899', '#f97316'];
  if (otherPct > 0) {
    labels.push('Lainnya');
    chartData.push(Math.round(otherPct * 10) / 10);
    colors.push('#475569');
  }

  modalChart = new Chart(document.getElementById('modalChart'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: chartData, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      responsive: false,
      plugins: { legend: { display: false } },
      cutout: '55%'
    }
  });

  // Fetch live price for modal
  const priceData = await fetchSinglePrice(code);
  if (priceData && priceData.last_price != null) {
    const chg = fmtChangePct(priceData.change_pct);
    const changeDir = priceData.change_pct > 0 ? 'up' : priceData.change_pct < 0 ? 'down' : 'flat';
    const changeSign = priceData.change_abs > 0 ? '+' : '';
    priceRow.innerHTML = `
      <span class="modal-price-main">Rp ${fmtPrice(priceData.last_price)}</span>
      <span class="modal-price-change ${changeDir}">${changeSign}${fmtPrice(priceData.change_abs)} (${chg.text})</span>
      <div class="modal-price-meta">
        ${priceData.market_cap ? `<span>MCap: Rp ${fmtNum(priceData.market_cap)}</span>` : ''}
        ${priceData.volume ? `<span>Vol: ${fmtNum(priceData.volume)}</span>` : ''}
      </div>
    `;
  } else {
    priceRow.innerHTML = '<span style="color:var(--text-muted);font-size:14px;">Harga tidak tersedia</span>';
  }
}

// ── Investor Page ──
async function renderInvestorPage(name) {
  const data = investorMap[name];
  if (!data) {
    document.getElementById('investorModalTitle').textContent = 'Investor tidak ditemukan';
    document.getElementById('investorModalType').innerHTML = '';
    document.getElementById('investorModalStats').innerHTML = '';
    document.getElementById('investorModalTableBody').innerHTML = '';
    document.getElementById('investorModalTotalVal').innerHTML = '-';
    return;
  }

  document.getElementById('investorModalTitle').textContent = name;
  const typeLabel = TYPE_LABELS[data.type] || data.type;
  const lfLabel = data.lf === 'L' ? 'Lokal' : 'Asing';
  document.getElementById('investorModalType').innerHTML = `
    <span class="badge-type" style="background:${TYPE_COLORS[data.type] || '#64748b'}22;color:${TYPE_COLORS[data.type] || '#64748b'}">${typeLabel}</span>
    &nbsp;
    <span class="${data.lf === 'L' ? 'badge-local' : 'badge-foreign'}">${lfLabel}</span>
  `;

  const stocks = data.stocks;
  const totalSharesAll = stocks.reduce((s, st) => s + st.shares, 0);

  // Stats (valuation placeholder)
  document.getElementById('investorModalStats').innerHTML = `
    <div class="modal-stat"><div class="label">Jumlah Saham</div><div class="value">${stocks.length}</div></div>
    <div class="modal-stat"><div class="label">Total Lembar</div><div class="value" style="font-size:18px;">${fmtShares(totalSharesAll)}</div></div>
    <div class="modal-stat"><div class="label">Est. Valuasi</div><div class="value" style="font-size:18px;color:var(--accent-emerald);" id="investorValuationStat"><div class="price-loading" style="width:80px;height:22px;"></div></div></div>
  `;

  // Render table with loading prices
  const sorted = [...stocks].sort((a, b) => b.shares - a.shares);
  const tbody = document.getElementById('investorModalTableBody');
  tbody.innerHTML = sorted.map(s => {
    const issuer = stockMap[s.code] ? stockMap[s.code].issuer : '-';
    const issuerShort = issuer.length > 30 ? issuer.substring(0, 30) + '...' : issuer;
    return `
    <tr onclick="location.hash='#/stock/${s.code}'">
      <td class="code-cell">${s.code}</td>
      <td class="issuer-cell" title="${issuer}">${issuerShort}</td>
      <td>${fmtNum(s.shares)}</td>
      <td style="font-weight:700;">${s.pct}%</td>
      <td id="inv-price-${s.code}"><div class="price-loading"></div></td>
      <td id="inv-val-${s.code}"><div class="price-loading" style="width:80px;"></div></td>
    </tr>`;
  }).join('');
  document.getElementById('investorModalTotalVal').innerHTML = '<div class="price-loading" style="width:80px;height:16px;display:inline-block;"></div>';

  // Fetch prices for all stocks
  const codes = sorted.map(s => s.code);
  const uniqueCodes = [...new Set(codes)];
  const needsFetch = uniqueCodes.filter(c => !priceMap[c] || priceMap[c].last_price == null);

  if (needsFetch.length > 0) {
    // Batch fetch in groups of 30
    for (let i = 0; i < needsFetch.length; i += 30) {
      const batch = needsFetch.slice(i, i + 30);
      try {
        const res = await fetch(`/api/prices?codes=${batch.join(',')}`);
        const data = await res.json();
        if (data.prices) Object.assign(priceMap, data.prices);
      } catch (e) { console.warn('Investor modal price fetch failed:', e); }
    }
  }

  // Update table with prices and valuations
  let totalValuation = 0;
  let hasAnyPrice = false;
  for (const s of sorted) {
    const priceEl = document.getElementById(`inv-price-${s.code}`);
    const valEl = document.getElementById(`inv-val-${s.code}`);
    if (!priceEl || !valEl) continue;

    const p = priceMap[s.code];
    if (p && p.last_price != null) {
      hasAnyPrice = true;
      const valuation = p.last_price * s.shares;
      totalValuation += valuation;
      priceEl.innerHTML = `<span class="price-cell">${fmtPrice(p.last_price)}</span>`;
      valEl.innerHTML = `<span style="font-weight:700;color:var(--accent-emerald);">Rp ${fmtNum(valuation)}</span>`;
    } else {
      priceEl.innerHTML = '<span style="color:var(--text-muted);">-</span>';
      valEl.innerHTML = '<span style="color:var(--text-muted);">-</span>';
    }
  }

  // Update total valuation
  const totalValEl = document.getElementById('investorModalTotalVal');
  const valStatEl = document.getElementById('investorValuationStat');
  if (hasAnyPrice) {
    const valText = `Rp ${fmtNum(totalValuation)}`;
    totalValEl.textContent = valText;
    valStatEl.textContent = valText;
  } else {
    totalValEl.textContent = '-';
    valStatEl.textContent = '-';
  }
}

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById(`tab-${tab}`).classList.add('active');
    currentTab = tab;
  });
});

// ── Autocomplete Search ──
const searchInput = document.getElementById('globalSearch');
const searchDropdown = document.getElementById('searchDropdown');

function closeDropdown() {
  searchDropdown.style.display = 'none';
}

// Close when clicking outside
document.addEventListener('click', (e) => {
  if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
    closeDropdown();
  }
});

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDropdown();
});

searchInput.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  if (!q) {
    closeDropdown();
    // Reset tables if search cleared
    stockPage = 1; investorPage = 1; updateStockTable(); updateInvestorTable();
    return;
  }

  // 1. Find matching stocks (deduplicated by code)
  const uniqueStockCodes = new Set();
  const matchingStocks = [];
  for (const s of rawData.items) {
    if (s.code.toLowerCase().includes(q) || s.issuer.toLowerCase().includes(q)) {
      if (!uniqueStockCodes.has(s.code)) {
        uniqueStockCodes.add(s.code);
        matchingStocks.push(s);
        if (matchingStocks.length >= 5) break;
      }
    }
  }

  // 2. Find matching investors
  const investorNames = Object.keys(investorMap);
  const matchingInvestors = investorNames
    .filter(name => name.toLowerCase().includes(q))
    .slice(0, 5); // top 5

  if (matchingStocks.length === 0 && matchingInvestors.length === 0) {
    searchDropdown.innerHTML = `<div class="dropdown-header" style="text-align:center;padding:16px;">Tidak ada hasil ditemukan</div>`;
    searchDropdown.style.display = 'block';
    return;
  }

  let html = '';

  // Render Stocks
  if (matchingStocks.length > 0) {
    html += `<div class="dropdown-header">Saham</div>`;
    html += matchingStocks.map(s => `
      <div class="autocomplete-item" onclick="location.hash='#/stock/${s.code}'; document.getElementById('globalSearch').value=''; closeDropdown()">
        <div>
          <span class="match-text">${s.code}</span>
          <span class="match-subtext">${s.issuer.length > 30 ? s.issuer.substring(0, 30) + '...' : s.issuer}</span>
        </div>
        <span class="match-badge badge-stock">Saham</span>
      </div>
    `).join('');
  }

  // Render Investors
  if (matchingInvestors.length > 0) {
    html += `<div class="dropdown-header">Investor</div>`;
    html += matchingInvestors.map(name => {
      const inv = investorMap[name];
      const safeName = name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
      const hash = '#/investor/' + encodeURIComponent(name);
      return `
      <div class="autocomplete-item" onclick="location.hash='${hash}'; document.getElementById('globalSearch').value=''; closeDropdown()">
        <div>
          <span class="match-text">${name}</span>
          <span class="match-subtext">${TYPE_LABELS[inv.type] || inv.type} &bull; ${inv.stocks.length} Saham</span>
        </div>
        <span class="match-badge badge-investor">Investor</span>
      </div>
    `}).join('');
  }

  searchDropdown.innerHTML = html;
  searchDropdown.style.display = 'block';
});

// Filters
document.getElementById('filterType').addEventListener('change', () => { stockPage = 1; updateStockTable(); });
document.getElementById('filterLF').addEventListener('change', () => { stockPage = 1; updateStockTable(); });

// Table sorting - stocks
document.querySelectorAll('#stockTable thead th[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.sort;
    if (stockSort.key === key) stockSort.asc = !stockSort.asc;
    else { stockSort.key = key; stockSort.asc = true; }
    document.querySelectorAll('#stockTable thead th').forEach(t => t.classList.remove('sorted'));
    th.classList.add('sorted');
    stockPage = 1;
    updateStockTable();
  });
});

// Table sorting - investors
document.querySelectorAll('#investorTable thead th[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.sort;
    if (investorSort.key === key) investorSort.asc = !investorSort.asc;
    else { investorSort.key = key; investorSort.asc = key === 'name'; }
    document.querySelectorAll('#investorTable thead th').forEach(t => t.classList.remove('sorted'));
    th.classList.add('sorted');
    investorPage = 1;
    updateInvestorTable();
  });
});

// ── Init ──
loadData().then(() => {
  // Trigger initial route once data is loaded
  handleHashChange();
});

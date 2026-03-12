import { fetchHolderData, fetchPricesBatch, fetchSinglePrice } from './api.js';

export const storeConfig = {
    rawData: null,
    stockMap: {},
    investorMap: {},
    priceMap: {},
    loading: true,
    error: null,
    sourceDate: '',

    // Pagination & Filters
    currentTab: 'stocks',
    stockPage: 1,
    investorPage: 1,
    pageSize: 30,
    searchQuery: '',
    tableSearchQuery: '',
    filterType: '',
    filterLF: '',

    // Sorting
    stockSortKey: 'code',
    stockSortAsc: true,
    investorSortKey: 'stockCount',
    investorSortAsc: false,

    // Stats
    totalStocks: 0,
    totalInvestors: 0,
    totalRecords: 0,
    localCount: 0,
    foreignCount: 0,

    // Autocomplete
    autocompleteStocks: [],
    autocompleteInvestors: [],
    showAutocomplete: false,

    // Modal Routing Base
    modalType: null, // 'stock' | 'investor'
    modalData: null,

    // Whale Map
    whaleSearch: '',
    whaleMinPct: 5,
    whaleLoading: false,
    whaleChartInstance: null,

    TYPE_LABELS: {
        CP: 'Corporate', ID: 'Individual', IB: 'Inv. Bank', SC: 'Sekuritas',
        MF: 'Reksa Dana', IS: 'Asuransi', PF: 'Dana Pensiun', OT: 'Lainnya',
        FD: 'Foundation', YY: 'Yayasan'
    },

    TYPE_COLORS: {
        CP: '#3b82f6', ID: '#8b5cf6', IB: '#f59e0b', SC: '#06b6d4',
        MF: '#10b981', IS: '#ec4899', PF: '#f97316', OT: '#64748b',
        FD: '#a78bfa', YY: '#34d399'
    },

    async init() {
        try {
            this.loading = true;
            const data = await fetchHolderData();
            this.rawData = data;
            this.sourceDate = data.source_date_in_file;
            this.processData();
            this.calculateStats();
            this.loading = false;

            // Re-eval charts event
            document.dispatchEvent(new CustomEvent('data-loaded'));
            this.handleHashRoute();

            window.addEventListener('hashchange', () => this.handleHashRoute());

            // Polling mechanism or initial bulk fetch could go here
            this.fetchVisiblePrices();

        } catch (e) {
            this.error = 'Gagal memuat data. Pastikan shareholder_data.json tersedia.';
            this.loading = false;
        }
    },

    processData() {
        const items = this.rawData.items || [];

        let sMap = {};
        let iMap = {};

        for (const item of items) {
            if (!sMap[item.code]) {
                sMap[item.code] = { issuer: item.issuer, holders: [] };
            }
            sMap[item.code].holders.push(item);

            if (!iMap[item.investor]) {
                iMap[item.investor] = { type: item.investor_type, lf: item.local_foreign, stocks: [] };
            }
            iMap[item.investor].stocks.push({
                code: item.code, pct: item.percentage, shares: item.shares
            });
        }

        this.stockMap = sMap;
        this.investorMap = iMap;
    },

    calculateStats() {
        const items = this.rawData.items || [];
        this.totalStocks = Object.keys(this.stockMap).length;
        this.totalInvestors = Object.keys(this.investorMap).length;
        this.totalRecords = items.length;

        let loc = 0; let nloc = 0;
        for (const item of items) {
            item.local_foreign === 'L' ? loc++ : nloc++;
        }
        this.localCount = loc;
        this.foreignCount = nloc;
    },

    handleHashRoute() {
        const hash = window.location.hash;
        if (hash.startsWith('#/stock/')) {
            const code = decodeURIComponent(hash.split('#/stock/')[1]);
            this.openStockModal(code);
        } else if (hash.startsWith('#/investor/')) {
            const name = decodeURIComponent(hash.split('#/investor/')[1]);
            this.openInvestorModal(name);
        } else {
            this.modalType = null;
            this.modalData = null;
        }
    },

    // Getters for computed lists
    get filteredStocks() {
        let rows = Object.entries(this.stockMap).map(([code, data]) => {
            let holders = data.holders;
            if (this.filterType) holders = holders.filter(h => h.investor_type === this.filterType);
            if (this.filterLF) holders = holders.filter(h => h.local_foreign === this.filterLF);

            if (holders.length === 0 && (this.filterType || this.filterLF)) return null;

            const topHolder = data.holders.reduce((a, b) => a.percentage > b.percentage ? a : b);
            const localShares = data.holders.filter(h => h.local_foreign === 'L').reduce((s, h) => s + h.percentage, 0);
            const allPct = data.holders.reduce((s, h) => s + h.percentage, 0);
            const localPct = allPct > 0 ? localShares : 0;

            const p = this.priceMap[code];
            const price = p ? p.last_price : null;
            const changePct = p ? p.change_pct : null;

            return {
                code, issuer: data.issuer,
                holders: data.holders.length,
                topPct: topHolder.percentage,
                topName: topHolder.investor,
                localPct: Math.round(localPct * 10) / 10,
                price: price,
                changePct: changePct,
            };
        }).filter(Boolean);

        const sq = this.tableSearchQuery.toLowerCase();
        if (sq) {
            rows = rows.filter(r =>
                r.code.toLowerCase().includes(sq) ||
                r.issuer.toLowerCase().includes(sq) ||
                r.topName.toLowerCase().includes(sq) ||
                this.stockMap[r.code].holders.some(h => h.investor.toLowerCase().includes(sq))
            );
        }

        // Sort
        rows.sort((a, b) => {
            let va = a[this.stockSortKey], vb = b[this.stockSortKey];
            if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
            if (va < vb) return this.stockSortAsc ? -1 : 1;
            if (va > vb) return this.stockSortAsc ? 1 : -1;
            return 0;
        });

        return rows;
    },

    get paginatedStocks() {
        const start = (this.stockPage - 1) * this.pageSize;
        return this.filteredStocks.slice(start, start + this.pageSize);
    },

    get totalStockPages() {
        return Math.ceil(this.filteredStocks.length / this.pageSize);
    },

    get filteredInvestors() {
        let rows = Object.entries(this.investorMap).map(([name, data]) => ({
            name, type: data.type, lf: data.lf,
            stockCount: data.stocks.length,
            stocks: data.stocks.map(s => s.code).join(', ')
        }));

        const sq = this.tableSearchQuery.toLowerCase();
        if (sq) {
            rows = rows.filter(r => r.name.toLowerCase().includes(sq) || r.stocks.toLowerCase().includes(sq));
        }

        rows.sort((a, b) => {
            let va = a[this.investorSortKey], vb = b[this.investorSortKey];
            if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
            if (va < vb) return this.investorSortAsc ? -1 : 1;
            if (va > vb) return this.investorSortAsc ? 1 : -1;
            return 0;
        });

        return rows;
    },

    get paginatedInvestors() {
        const start = (this.investorPage - 1) * this.pageSize;
        return this.filteredInvestors.slice(start, start + this.pageSize);
    },

    get totalInvestorPages() {
        return Math.ceil(this.filteredInvestors.length / this.pageSize);
    },

    // Sorting toggles
    sortStock(key) {
        if (this.stockSortKey === key) this.stockSortAsc = !this.stockSortAsc;
        else { this.stockSortKey = key; this.stockSortAsc = true; }
        this.stockPage = 1;
    },

    sortInvestor(key) {
        if (this.investorSortKey === key) this.investorSortAsc = !this.investorSortAsc;
        else { this.investorSortKey = key; this.investorSortAsc = (key === 'name'); }
        this.investorPage = 1;
    },

    // Pricing
    async fetchVisiblePrices() {
        if (this.currentTab !== 'stocks') return;
        const visibleCodes = this.paginatedStocks.map(s => s.code);
        const needsFetch = visibleCodes.filter(c => !this.priceMap[c] || this.priceMap[c].last_price == null);

        if (needsFetch.length > 0) {
            const fetched = await fetchPricesBatch(needsFetch);
            this.priceMap = { ...this.priceMap, ...fetched };
        }
    },

    async fetchSingleModalPrice(code) {
        if (!this.priceMap[code] || this.priceMap[code].last_price == null) {
            const data = await fetchSinglePrice(code);
            if (data) {
                this.priceMap = { ...this.priceMap, [code]: data };
            }
        }
    },

    // Search Autocomplete
    updateSearch(val) {
        this.searchQuery = val;
        const q = val.toLowerCase().trim();
        if (!q) {
            this.showAutocomplete = false;
            this.autocompleteStocks = [];
            this.autocompleteInvestors = [];
            return;
        }

        const uniqueStockCodes = new Set();
        const matchingStocks = [];
        for (const s of this.rawData.items) {
            if (s.code.toLowerCase().includes(q) || s.issuer.toLowerCase().includes(q)) {
                if (!uniqueStockCodes.has(s.code)) {
                    uniqueStockCodes.add(s.code);
                    matchingStocks.push(s);
                    if (matchingStocks.length >= 5) break;
                }
            }
        }

        const investorNames = Object.keys(this.investorMap);
        const matchingInvestors = investorNames
            .filter(name => name.toLowerCase().includes(q))
            .slice(0, 5);

        this.autocompleteStocks = matchingStocks;
        this.autocompleteInvestors = matchingInvestors.map(name => ({
            name, ...this.investorMap[name]
        }));

        this.showAutocomplete = true;
    },

    submitSearch() {
        this.tableSearchQuery = this.searchQuery;
        this.stockPage = 1;
        this.investorPage = 1;
        this.showAutocomplete = false;
        if (this.currentTab === 'analytics') {
            this.currentTab = 'stocks';
        }
    },

    // Modals
    openStockModal(code) {
        const data = this.stockMap[code];
        if (!data) return;

        const totalShares = data.holders.reduce((s, h) => s + h.shares, 0);
        const totalPct = data.holders.reduce((s, h) => s + h.percentage, 0);
        const localPct = data.holders.filter(h => h.local_foreign === 'L').reduce((s, h) => s + h.percentage, 0);
        const sortedHolders = [...data.holders].sort((a, b) => b.percentage - a.percentage);

        this.modalType = 'stock';
        this.modalData = { code, issuer: data.issuer, totalShares, totalPct, localPct, holders: sortedHolders };
        this.fetchSingleModalPrice(code);

        // Let UI render then trigger chart event
        setTimeout(() => document.dispatchEvent(new CustomEvent('render-modal-chart')), 100);
    },

    async openInvestorModal(name) {
        const data = this.investorMap[name];
        if (!data) return;

        const stocks = [...data.stocks].sort((a, b) => b.shares - a.shares);
        const enrichedStocks = stocks.map(s => ({
            ...s,
            issuer: this.stockMap[s.code] ? this.stockMap[s.code].issuer : '-'
        }));

        this.modalType = 'investor';
        this.modalData = { name, ...data, stocks: enrichedStocks };

        // Fetch prices for the investor's portfolio
        const codes = enrichedStocks.map(s => s.code);
        const uniqueCodes = [...new Set(codes)];
        const needsFetch = uniqueCodes.filter(c => !this.priceMap[c] || this.priceMap[c].last_price == null);

        for (let i = 0; i < needsFetch.length; i += 30) {
            const batch = needsFetch.slice(i, i + 30);
            const fetched = await fetchPricesBatch(batch);
            this.priceMap = { ...this.priceMap, ...fetched };
        }
    },

    // Whale Map Logic
    renderWhaleMap() {
        if (this.currentTab !== 'whalemap') {
            if (this.whaleChartInstance) {
                this.whaleChartInstance.dispose();
                this.whaleChartInstance = null;
            }
            return;
        }

        this.whaleLoading = true;

        // Give UI time to show loading state before heavy processing
        setTimeout(() => {
            const container = document.getElementById('whaleMapContainer');
            if (!container) {
                this.whaleLoading = false;
                return;
            }

            if (!this.whaleChartInstance) {
                this.whaleChartInstance = echarts.init(container);
                
                // Handle Window Resize
                window.addEventListener('resize', () => {
                    if (this.whaleChartInstance && this.currentTab === 'whalemap') {
                        this.whaleChartInstance.resize();
                    }
                });

                // Handle Node Click
                this.whaleChartInstance.on('click', (params) => {
                    if (params.dataType === 'node') {
                        if (params.data.category === 0) {
                            window.location.hash = '#/investor/' + encodeURIComponent(params.data.name);
                        } else if (params.data.category === 1) {
                            window.location.hash = '#/stock/' + params.data.name;
                        }
                    }
                });
            }

            // Start Data Processing
            const items = this.rawData.items || [];
            const minPct = parseFloat(this.whaleMinPct);
            const searchQ = this.whaleSearch.toLowerCase().trim();

            let nodesData = []; // { id, name, category, symbolSize, value }
            let linksData = []; // { source, target, value, lineStyle }
            
            const addedInvestors = new Set();
            const addedStocks = new Set();
            const edgesMap = new Map(); // Track edges to prevent duplicates

            for (const item of items) {
                if (item.percentage < minPct) continue;

                const invName = item.investor;
                const stockCode = item.code;

                // If search is active, skip items that don't match the search term
                // Note: To make it a 'network', we match if either the investor OR the stock matches
                if (searchQ) {
                    if (!invName.toLowerCase().includes(searchQ) && !stockCode.toLowerCase().includes(searchQ)) {
                        continue;
                    }
                }

                // Add Investor Node
                if (!addedInvestors.has(invName)) {
                    const invData = this.investorMap[invName];
                    const invStocksCount = invData ? invData.stocks.length : 1;
                    
                    // Base size 15, max 40 depending on number of stocks owned
                    const size = Math.min(40, 15 + (invStocksCount * 2));
                    
                    nodesData.push({
                        id: 'inv_' + invName,
                        name: invName,
                        category: 0, // Investor
                        symbolSize: size,
                        value: invStocksCount + ' Saham',
                        label: { show: size > 25 || searchQ !== '' } // Only show labels for big/searched nodes by default
                    });
                    addedInvestors.add(invName);
                }

                // Add Stock Node
                if (!addedStocks.has(stockCode)) {
                    const stockData = this.stockMap[stockCode];
                    const stockHoldersCount = stockData ? stockData.holders.length : 1;
                    
                    // Base size 15, max 45 depending on number of whales inside it
                    const size = Math.min(45, 15 + (stockHoldersCount * 2));

                    nodesData.push({
                        id: 'stk_' + stockCode,
                        name: stockCode,
                        category: 1, // Stock
                        symbolSize: size,
                        value: stockHoldersCount + ' Investor Besar',
                        label: { show: size > 25 || searchQ !== '' }
                    });
                    addedStocks.add(stockCode);
                }

                // Add Edge
                const edgeKey = `inv_${invName}-stk_${stockCode}`;
                if (!edgesMap.has(edgeKey)) {
                    // Line thickness based on percentage
                    const width = Math.max(0.5, item.percentage / 5);
                    
                    linksData.push({
                        source: 'inv_' + invName,
                        target: 'stk_' + stockCode,
                        value: item.percentage,
                        lineStyle: { width: Math.min(5, width) }
                    });
                    edgesMap.set(edgeKey, true);
                }
            }

            // If a search is applied and it found nothing, or if filters are too strict
            if (nodesData.length === 0) {
                this.whaleChartInstance.clear();
                this.whaleChartInstance.setOption({
                    title: {
                        text: 'Tidak ada data',
                        subtext: 'Ubah filter minimum kepemilikan atau kata kunci pencarian.',
                        left: 'center',
                        top: 'center',
                        textStyle: { color: '#94a3b8' }
                    }
                });
                this.whaleLoading = false;
                return;
            }

            const option = {
                backgroundColor: 'transparent',
                tooltip: {
                    trigger: 'item',
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    textStyle: { color: '#f8fafc' },
                    formatter: function (params) {
                        if (params.dataType === 'node') {
                            const type = params.data.category === 0 ? 'Investor' : 'Emiten Saham';
                            return `<div class="font-bold text-blue-400 mb-1">${type}</div>
                                    <div class="text-sm font-semibold">${params.data.name}</div>
                                    <div class="text-xs text-slate-400 mt-1">${params.data.category === 0 ? 'Portofolio: ' : 'Jumlah Whale: '}${params.data.value}</div>`;
                        } else if (params.dataType === 'edge') {
                            const sourceName = params.data.source.replace('inv_', '');
                            const targetName = params.data.target.replace('stk_', '');
                            return `<div class="font-bold text-blue-400 mb-1">Kepemilikan</div>
                                    <div class="text-xs text-slate-300">Investor: <span class="font-bold text-white">${sourceName}</span></div>
                                    <div class="text-xs text-slate-300">Saham: <span class="font-bold text-white">${targetName}</span></div>
                                    <div class="text-xs mt-1 text-emerald-400 font-bold">Porsi: ${params.data.value.toFixed(2)}%</div>`;
                        }
                    }
                },
                legend: {
                    data: ['Investor', 'Saham'],
                    textStyle: { color: '#94a3b8' },
                    bottom: 20
                },
                series: [
                    {
                        type: 'graph',
                        layout: 'force',
                        data: nodesData,
                        links: linksData,
                        categories: [
                            { name: 'Investor', itemStyle: { color: '#8b5cf6' } }, // Purple
                            { name: 'Saham', itemStyle: { color: '#3b82f6' } }     // Blue
                        ],
                        roam: true, // Enable zoom and pan
                        label: {
                            position: 'right',
                            formatter: '{b}',
                            color: '#e2e8f0',
                            fontSize: 10,
                            textBorderColor: '#0f172a',
                            textBorderWidth: 2
                        },
                        lineStyle: {
                            color: 'source',
                            curveness: 0.1,
                            opacity: 0.6
                        },
                        emphasis: {
                            focus: 'adjacency',
                            lineStyle: { width: 3, opacity: 1 },
                            label: { show: true }
                        },
                        force: {
                            repulsion: 150,
                            edgeLength: [50, 100],
                            gravity: 0.1,
                            friction: 0.6
                        }
                    }
                ]
            };

            this.whaleChartInstance.setOption(option);
            this.whaleLoading = false;
        }, 50);
    }
};

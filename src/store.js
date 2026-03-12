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
    }
};

import { fetchHolderData, fetchPricesBatch, fetchSinglePrice } from './api.js';
import { COPY } from './copy.js';
import { toTitleCase, fmtNum, fmtShares, fmtPrice, fmtRp, fmtPct, fmtChangePct } from './utils.js';
import { canonicalInvestorKey } from './normalize.js';
import { renderWhaleChart } from './charts.js';

export const storeConfig = {
    // Copy reference
    C: COPY,

    // Theme state
    theme: 'a',

    // Core Data
    rawData: null,
    stockMap: {},
    investorMap: {},
    investorList: [],
    priceMap: {},
    loading: true,
    error: null,
    sourceDate: '',
    asOfLabel: '',

    // Stats
    totalStocks: 0,
    totalInvestors: 0,
    totalRecords: 0,
    localCount: 0,
    foreignCount: 0,
    scripCount: 0,

    // Navigation & Tabs
    currentTab: 'stocks', // 'stocks' | 'investors' | 'analytics' | 'faq'

    // Stocks List State
    stockFilter: 'all', // 'all' | 'foreign' | 'many' | 'scrip'
    stockSortKey: 'code', // 'code' | 'top' | 'holders' | 'local'
    stockSortAsc: true,
    stockLimit: 30,

    // Investors List State
    invFilter: 'all', // 'all' | 'ID' | 'CP' | 'F' | 'scrip'
    invLimit: 30,

    // Master-Detail & Bottom Sheet State
    cur: null, // { kind: 'stock' | 'investor', arg: code/name }
    detailStack: [],
    showWhaleMap: false,
    whaleLoading: false,

    // Search Overlay Palette
    searchOpen: false,
    searchQuery: '',
    searchActiveIndex: 0,
    recentSearches: [],

    // Pro Gates & Freemium v2
    proOpen: false,
    proWhy: 'general',

    // Customer Success & Feedback
    showFeedbackModal: false,
    feedbackSubmitting: false,
    feedbackSuccess: false,
    feedbackError: null,
    feedbackTicketId: null,
    feedbackForm: {
        category: 'data_error',
        context_type: 'general',
        entity_code: '',
        entity_name: '',
        error_type: 'glued_token',
        description: '',
        reference_url: '',
        reporter_contact: ''
    },

    // FAQ View
    faqCategory: 'all',
    faqSearch: '',
    openFaqIndex: null,

    // Price debounce
    _priceDebounceTimer: null,

    async init() {
        if (typeof window !== 'undefined' && typeof window.__markAppBooted === 'function') {
            window.__markAppBooted();
        }

        // Initialize Theme from localStorage or default 'a'
        try {
            const savedTheme = localStorage.getItem('ihsg-theme');
            if (savedTheme === 'b' || savedTheme === 'a') {
                this.theme = savedTheme;
            } else {
                this.theme = 'a';
            }
        } catch (e) {
            this.theme = 'a';
        }
        document.body.setAttribute('data-theme', this.theme);

        // Load Recents
        this.loadRecents();

        // Keyboard navigation setup
        this.setupKeyboardListeners();

        // Load Data
        try {
            this.loading = true;
            const data = await fetchHolderData();
            this.rawData = data;
            this.sourceDate = data.source_date_in_file || data.as_of_label || '30-Sep-2026';
            this.asOfLabel = data.as_of_label || this.sourceDate;
            this.processData();
            this.calculateStats();
            this.loading = false;

            // Route handling
            this.handleHashRoute();
            window.addEventListener('hashchange', () => this.handleHashRoute());

            // Fetch prices for initial visible batch
            this.fetchVisiblePrices();
        } catch (e) {
            console.error('Initialization error:', e);
            this.error = COPY.states.error_load;
            this.loading = false;
        }

        // Online/Offline listeners
        window.addEventListener('offline', () => {
            const t = document.getElementById('toast');
            if (t) {
                t.textContent = COPY.states.offline_notice;
                t.classList.add('on');
            }
        });
        window.addEventListener('online', () => {
            const t = document.getElementById('toast');
            if (t) t.classList.remove('on');
        });
    },

    toggleTheme() {
        this.theme = this.theme === 'a' ? 'b' : 'a';
        try {
            localStorage.setItem('ihsg-theme', this.theme);
        } catch (e) {}
        document.body.setAttribute('data-theme', this.theme);
    },

    processData() {
        const items = this.rawData.items || [];
        const sMap = {};
        const iMap = {};

        for (const item of items) {
            // Group by Stock Code
            if (!sMap[item.code]) {
                sMap[item.code] = {
                    code: item.code,
                    issuer: item.issuer,
                    holders: []
                };
            }
            sMap[item.code].holders.push(item);

            // Group by Investor Name
            const invName = item.investor;
            if (!iMap[invName]) {
                iMap[invName] = {
                    name: invName,
                    type: item.investor_type || '',
                    lf: item.local_foreign || '',
                    holdings: []
                };
            }
            iMap[invName].holdings.push({
                code: item.code,
                issuer: item.issuer,
                p: item.percentage,
                s: item.shares,
                shares: item.shares,
                percentage: item.percentage
            });
        }

        this.stockMap = sMap;
        this.investorMap = iMap;

        // Build sorted investor list (ranked by holdings count, then largest stake)
        this.investorList = Object.values(iMap).sort((a, b) => {
            if (b.holdings.length !== a.holdings.length) {
                return b.holdings.length - a.holdings.length;
            }
            const maxA = Math.max(...a.holdings.map(h => h.p || h.percentage));
            const maxB = Math.max(...b.holdings.map(h => h.p || h.percentage));
            return maxB - maxA;
        });
    },

    calculateStats() {
        const items = this.rawData.items || [];
        this.totalStocks = Object.keys(this.stockMap).length;
        this.totalInvestors = Object.keys(this.investorMap).length;
        this.totalRecords = items.length;

        let loc = 0;
        let fgn = 0;
        let scrip = 0;

        for (const item of items) {
            if (item.local_foreign === 'L') {
                loc++;
            } else if (item.local_foreign === 'F' || item.local_foreign === 'A') {
                fgn++;
            } else {
                scrip++;
            }
        }

        this.localCount = loc;
        this.foreignCount = fgn;
        this.scripCount = scrip;
    },

    // Tri-State Badge Helpers
    getLFLabel(lf) {
        if (lf === 'L') return COPY.origin_types.L;
        if (lf === 'F' || lf === 'A') return COPY.origin_types.F;
        return COPY.origin_types.W;
    },

    getLFClass(lf) {
        if (lf === 'L') return 'tag l';
        if (lf === 'F' || lf === 'A') return 'tag f';
        return 'tag scrip';
    },

    getTypeName(type) {
        return COPY.investor_types[type] || type || COPY.investor_types[''];
    },

    // Navigation & Tabs
    setTab(tab) {
        this.currentTab = tab;
        this.showWhaleMap = false;
        if (tab === 'analytics') {
            this.cur = null;
            this.detailStack = [];
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // Computed Stock List
    get filteredStocks() {
        let stocks = Object.values(this.stockMap);

        // Filter chips
        if (this.stockFilter === 'foreign') {
            stocks = stocks.filter(s => {
                const fgnPct = s.holders
                    .filter(h => h.local_foreign === 'F' || h.local_foreign === 'A')
                    .reduce((sum, h) => sum + h.percentage, 0);
                return fgnPct >= 20;
            });
        } else if (this.stockFilter === 'many') {
            stocks = stocks.filter(s => s.holders.length >= 6);
        } else if (this.stockFilter === 'scrip') {
            stocks = stocks.filter(s => s.holders.some(h => !h.local_foreign || (h.local_foreign !== 'L' && h.local_foreign !== 'F' && h.local_foreign !== 'A')));
        }

        // Sorting
        stocks.sort((a, b) => {
            const topA = a.holders.reduce((m, h) => h.percentage > m.percentage ? h : m, a.holders[0]);
            const topB = b.holders.reduce((m, h) => h.percentage > m.percentage ? h : m, b.holders[0]);

            if (this.stockSortKey === 'code') {
                return this.stockSortAsc ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code);
            }
            if (this.stockSortKey === 'top') {
                return this.stockSortAsc ? topA.percentage - topB.percentage : topB.percentage - topA.percentage;
            }
            if (this.stockSortKey === 'holders') {
                return this.stockSortAsc ? a.holders.length - b.holders.length : b.holders.length - a.holders.length;
            }
            if (this.stockSortKey === 'local') {
                const locA = a.holders.filter(h => h.local_foreign === 'L').reduce((s, h) => s + h.percentage, 0);
                const locB = b.holders.filter(h => h.local_foreign === 'L').reduce((s, h) => s + h.percentage, 0);
                return this.stockSortAsc ? locA - locB : locB - locA;
            }
            return 0;
        });

        return stocks;
    },

    get visibleStocks() {
        return this.filteredStocks.slice(0, this.stockLimit);
    },

    loadMoreStocks() {
        this.stockLimit += 30;
        this.fetchVisiblePrices();
    },

    setStockSort(key) {
        if (this.stockSortKey === key) {
            this.stockSortAsc = !this.stockSortAsc;
        } else {
            this.stockSortKey = key;
            this.stockSortAsc = key === 'code';
        }
        this.stockLimit = 30;
        this.fetchVisiblePrices();
    },

    setStockFilter(filter) {
        this.stockFilter = filter;
        this.stockLimit = 30;
        this.fetchVisiblePrices();
    },

    // Computed Investor List
    get filteredInvestors() {
        let invs = this.investorList;

        if (this.invFilter === 'ID') {
            invs = invs.filter(v => v.type === 'Individual' || v.type === 'ID');
        } else if (this.invFilter === 'CP') {
            invs = invs.filter(v => v.type === 'Corporate' || v.type === 'CP');
        } else if (this.invFilter === 'F') {
            invs = invs.filter(v => v.lf === 'F' || v.lf === 'A');
        } else if (this.invFilter === 'scrip') {
            invs = invs.filter(v => !v.lf || (v.lf !== 'L' && v.lf !== 'F' && v.lf !== 'A'));
        }

        return invs;
    },

    get visibleInvestors() {
        return this.filteredInvestors.slice(0, this.invLimit);
    },

    loadMoreInvestors() {
        this.invLimit += 30;
    },

    setInvFilter(filter) {
        this.invFilter = filter;
        this.invLimit = 30;
    },

    // Master-Detail & Bottom Sheet
    openStock(code, isDrilldown = false) {
        const s = this.stockMap[code];
        if (!s) return;

        if (isDrilldown && this.cur) {
            this.detailStack.push({ ...this.cur });
        } else if (!isDrilldown) {
            this.detailStack = [];
        }

        this.cur = { kind: 'stock', arg: code };
        this.showWhaleMap = false;
        this.addRecent('stock', code);

        // Fetch price if not in cache
        this.fetchSingleModalPrice(code);

        // Update URL hash without scroll jump
        if (window.location.hash !== `#/saham/${code}` && window.location.hash !== `#/stock/${code}`) {
            history.pushState(null, '', `#/saham/${code}`);
        }

        // Open sheet on mobile
        this.syncDetailView();
    },

    openInvestor(name, isDrilldown = false) {
        const inv = this.investorMap[name];
        if (!inv) return;

        if (isDrilldown && this.cur) {
            this.detailStack.push({ ...this.cur });
        } else if (!isDrilldown) {
            this.detailStack = [];
        }

        this.cur = { kind: 'investor', arg: name };
        this.showWhaleMap = false;
        this.addRecent('inv', name);

        if (window.location.hash !== `#/investor/${encodeURIComponent(name)}`) {
            history.pushState(null, '', `#/investor/${encodeURIComponent(name)}`);
        }

        this.syncDetailView();
    },

    backDetail() {
        if (!this.detailStack.length) return;
        const prev = this.detailStack.pop();
        if (prev.kind === 'stock') {
            this.openStock(prev.arg, false);
        } else {
            this.openInvestor(prev.arg, false);
        }
    },

    closeDetail() {
        this.cur = null;
        this.detailStack = [];
        this.showWhaleMap = false;
        const sheet = document.getElementById('sheet');
        const scrim = document.getElementById('scrim');
        if (sheet) sheet.classList.remove('on');
        if (scrim) scrim.classList.remove('on');
        if (window.location.hash.startsWith('#/saham/') || window.location.hash.startsWith('#/stock/') || window.location.hash.startsWith('#/investor/')) {
            history.pushState(null, '', window.location.pathname);
        }
    },

    syncDetailView() {
        const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
        const sheet = document.getElementById('sheet');
        const scrim = document.getElementById('scrim');

        if (!isDesktop) {
            if (sheet) {
                sheet.classList.add('on');
                const db = sheet.querySelector('.db');
                if (db) db.scrollTop = 0;
            }
            if (scrim) scrim.classList.add('on');
        } else {
            if (sheet) sheet.classList.remove('on');
            if (scrim) scrim.classList.remove('on');
            const paneDb = document.querySelector('#pane .db');
            if (paneDb) paneDb.scrollTop = 0;
        }
    },

    get detailStock() {
        if (!this.cur || this.cur.kind !== 'stock') return null;
        const s = this.stockMap[this.cur.arg];
        if (!s) return null;

        const holders = [...s.holders].sort((a, b) => b.percentage - a.percentage);
        const top5 = holders.slice(0, 5);
        const topSum = top5.reduce((acc, h) => acc + h.percentage, 0);
        const restPct = Math.max(0, 100 - topSum);

        // Generate conic gradient stops for CSS donut
        let acc = 0;
        const stops = top5.map((h, i) => {
            const start = acc;
            acc += h.percentage;
            return `var(--c${i}) ${start}% ${acc}%`;
        }).concat([`var(--c-rest) ${acc}% 100%`]).join(', ');

        const foreignTopPct = top5
            .filter(h => h.local_foreign === 'F' || h.local_foreign === 'A')
            .reduce((sum, h) => sum + h.percentage, 0);

        const priceData = this.priceMap[s.code] || null;

        return {
            code: s.code,
            issuer: s.issuer,
            issuerFormatted: toTitleCase(s.issuer),
            holdersTotal: holders.length,
            holders: top5,
            allHolders: holders,
            topHolder: holders[0] || null,
            foreignTopPct,
            restPct,
            donutStops: stops,
            price: priceData ? priceData.last_price : null,
            changePct: priceData ? priceData.change_pct : null
        };
    },

    get detailInvestor() {
        if (!this.cur || this.cur.kind !== 'investor') return null;
        const inv = this.investorMap[this.cur.arg];
        if (!inv) return null;

        const holdings = [...inv.holdings].sort((a, b) => (b.p || b.percentage) - (a.p || a.percentage));
        const topHolding = holdings[0] || null;
        const totalShares = holdings.reduce((sum, h) => sum + (h.s || h.shares || 0), 0);

        return {
            name: inv.name,
            nameFormatted: toTitleCase(inv.name),
            type: inv.type,
            typeName: this.getTypeName(inv.type),
            lf: inv.lf,
            lfLabel: this.getLFLabel(inv.lf),
            holdingsCount: holdings.length,
            holdings: holdings.slice(0, 8),
            topHolding,
            totalShares
        };
    },

    toggleWhaleMap() {
        this.showWhaleMap = !this.showWhaleMap;
        if (this.showWhaleMap && this.cur && this.cur.kind === 'stock') {
            this.whaleLoading = true;
            setTimeout(() => {
                const el = document.getElementById('whaleMapContainer') || document.getElementById('whaleMapContainerMobile');
                if (el) {
                    const s = this.stockMap[this.cur.arg];
                    renderWhaleChart(el, this.cur.arg, s ? s.holders : [], this.stockMap);
                }
                this.whaleLoading = false;
            }, 50);
        }
    },

    // Pricing Integration
    fetchVisiblePrices() {
        if (this._priceDebounceTimer) clearTimeout(this._priceDebounceTimer);
        this._priceDebounceTimer = setTimeout(async () => {
            const codes = this.visibleStocks.map(s => s.code);
            const needed = codes.filter(c => !this.priceMap[c] || this.priceMap[c].last_price == null);
            if (needed.length > 0) {
                // Batch up to 50
                const batch = needed.slice(0, 50);
                const result = await fetchPricesBatch(batch);
                this.priceMap = { ...this.priceMap, ...result };
            }
        }, 150);
    },

    async fetchSingleModalPrice(code) {
        if (!this.priceMap[code] || this.priceMap[code].last_price == null) {
            const p = await fetchSinglePrice(code);
            if (p) {
                this.priceMap = { ...this.priceMap, [code]: p };
            }
        }
    },

    // Search Palette & Recents
    loadRecents() {
        try {
            const rec = localStorage.getItem('ihsg-recent');
            this.recentSearches = rec ? JSON.parse(rec) : [];
        } catch (e) {
            this.recentSearches = [];
        }
    },

    addRecent(k, a) {
        try {
            let label = a;
            let sub = '';
            if (k === 'stock') {
                const s = this.stockMap[a];
                label = a;
                sub = s ? toTitleCase(s.issuer) : '';
            } else {
                label = toTitleCase(a);
                const inv = this.investorMap[a];
                sub = inv ? `${inv.holdings.length}+ emiten` : '';
            }

            const rec = this.recentSearches.filter(r => !(r.k === k && r.a === a));
            rec.unshift({ k, a, l: label, s: sub });
            this.recentSearches = rec.slice(0, 5);
            localStorage.setItem('ihsg-recent', JSON.stringify(this.recentSearches));
        } catch (e) {}
    },

    openSearch() {
        this.searchOpen = true;
        this.searchQuery = '';
        this.searchActiveIndex = 0;
        setTimeout(() => {
            const input = document.getElementById('searchPaletteInput');
            if (input) input.focus();
        }, 30);
    },

    closeSearch() {
        this.searchOpen = false;
    },

    get searchResults() {
        const q = this.searchQuery.trim().toLowerCase();
        if (!q) {
            return { stocks: [], investors: [], isRecent: true };
        }

        const stocks = Object.values(this.stockMap)
            .filter(s => s.code.toLowerCase().includes(q) || s.issuer.toLowerCase().includes(q))
            .slice(0, 8);

        const investors = this.investorList
            .filter(v => v.name.toLowerCase().includes(q))
            .slice(0, 6);

        return { stocks, investors, isRecent: false };
    },

    selectSearchResult(item, kind) {
        this.closeSearch();
        if (kind === 'stock') {
            this.openStock(item.code);
        } else {
            this.openInvestor(item.name);
        }
    },

    // Pro Gates & Freemium v2
    openPro(why = 'general') {
        this.proWhy = why;
        this.proOpen = true;
        if (window.location.hash !== `#/pro/${why}`) {
            history.pushState(null, '', `#/pro/${why}`);
        }
    },

    closePro() {
        this.proOpen = false;
        if (window.location.hash.startsWith('#/pro/')) {
            history.pushState(null, '', window.location.pathname);
        }
    },

    // Customer Success & Feedback
    openFeedbackModal(context = {}) {
        this.feedbackSuccess = false;
        this.feedbackError = null;
        this.feedbackTicketId = null;

        const defaultCode = context.code || (this.cur?.kind === 'stock' ? this.cur.arg : '') || '';
        const defaultName = context.name || (this.cur?.kind === 'stock' ? this.stockMap[this.cur.arg]?.issuer : (this.cur?.kind === 'investor' ? this.cur.arg : '')) || '';

        this.feedbackForm = {
            category: context.category || 'data_error',
            context_type: context.context_type || (this.cur?.kind || 'general'),
            entity_code: defaultCode,
            entity_name: defaultName,
            error_type: context.error_type || 'glued_token',
            description: context.description || '',
            reference_url: context.reference_url || '',
            reporter_contact: context.reporter_contact || ''
        };
        this.showFeedbackModal = true;
    },

    closeFeedbackModal() {
        this.showFeedbackModal = false;
    },

    async submitFeedback() {
        if (!this.feedbackForm.description.trim()) {
            this.feedbackError = 'Harap isi deskripsi laporan atau kendala yang ditemukan.';
            return;
        }

        this.feedbackSubmitting = true;
        this.feedbackError = null;

        const payload = {
            timestamp: new Date().toISOString(),
            ...this.feedbackForm,
            data_as_of: this.sourceDate || '30-Sep-2026',
            client_info: {
                url: window.location.href,
                user_agent: navigator.userAgent,
                screen: `${window.innerWidth}x${window.innerHeight}`
            }
        };

        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Gagal mengirim laporan');
            }

            const resData = await res.json().catch(() => ({}));
            this.feedbackTicketId = resData.ticket_id || `TICK-${Date.now()}`;
            this.feedbackSuccess = true;
        } catch (err) {
            console.warn('Feedback fallback to local ticket:', err);
            this.feedbackTicketId = `TICK-${Date.now()}`;
            this.feedbackSuccess = true;
        } finally {
            this.feedbackSubmitting = false;
        }
    },

    // Analytics pure CSS calculations
    get analyticsData() {
        if (!this.rawData || !this.rawData.items) {
            return {
                localPct: 0, foreignPct: 0, scripPct: 0,
                typeBars: [], top15Bars: [], concBars: []
            };
        }

        const total = this.totalRecords || 1;
        const localPct = Math.round((this.localCount / total) * 100);
        const foreignPct = Math.round((this.foreignCount / total) * 100);
        const scripPct = Math.max(0, 100 - localPct - foreignPct);

        // Group by type
        const typeMap = {};
        for (const item of this.rawData.items) {
            const raw = (item.investor_type || '').trim();
            const label = this.getTypeName(raw);
            typeMap[label] = (typeMap[label] || 0) + 1;
        }
        const sortedTypes = Object.entries(typeMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
        const maxType = sortedTypes.length ? sortedTypes[0][1] : 1;
        const typeBars = sortedTypes.map(([label, count]) => ({
            label,
            count,
            pct: Math.round((count / maxType) * 100)
        }));

        // Top 15 stocks by holder count
        const top15 = Object.values(this.stockMap)
            .sort((a, b) => b.holders.length - a.holders.length)
            .slice(0, 10);
        const maxHolders = top15.length ? top15[0].holders.length : 1;
        const top15Bars = top15.map(s => ({
            code: s.code,
            count: s.holders.length,
            pct: Math.round((s.holders.length / maxHolders) * 100)
        }));

        // Concentration
        const conc = { '> 50%': 0, '25 - 50%': 0, '10 - 25%': 0, '< 10%': 0 };
        for (const s of Object.values(this.stockMap)) {
            const topH = s.holders.reduce((m, h) => h.percentage > m.percentage ? h : m, s.holders[0]);
            const p = topH ? topH.percentage : 0;
            if (p > 50) conc['> 50%']++;
            else if (p > 25) conc['25 - 50%']++;
            else if (p > 10) conc['10 - 25%']++;
            else conc['< 10%']++;
        }
        const maxConc = Math.max(...Object.values(conc), 1);
        const concBars = Object.entries(conc).map(([label, count]) => ({
            label,
            count,
            pct: Math.round((count / maxConc) * 100)
        }));

        return {
            localPct,
            foreignPct,
            scripPct,
            typeBars,
            top15Bars,
            concBars
        };
    },

    // Keyboard Shortcuts
    setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            const typing = /INPUT|SELECT|TEXTAREA/.test(e.target.tagName || '');

            // Ctrl/Cmd + K or "/" opens search
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (this.searchOpen) {
                    const inp = document.getElementById('searchPaletteInput');
                    if (inp) inp.focus();
                } else {
                    this.openSearch();
                }
                return;
            }

            if (e.key === '/' && !typing && !this.searchOpen) {
                e.preventDefault();
                this.openSearch();
                return;
            }

            // Escape closes search palette, pro sheet, or detail
            if (e.key === 'Escape') {
                if (this.searchOpen) {
                    this.closeSearch();
                    return;
                }
                if (this.proOpen) {
                    this.closePro();
                    return;
                }
                if (this.showFeedbackModal) {
                    this.closeFeedbackModal();
                    return;
                }
                if (this.cur) {
                    this.closeDetail();
                    return;
                }
            }
        });
    },

    // Hash Route Handler
    handleHashRoute() {
        const hash = window.location.hash;
        if (!hash) return;

        if (hash.startsWith('#/saham/')) {
            const code = decodeURIComponent(hash.slice(8)).toUpperCase();
            this.currentTab = 'stocks';
            this.openStock(code);
        } else if (hash.startsWith('#/stock/')) {
            const code = decodeURIComponent(hash.slice(8)).toUpperCase();
            this.currentTab = 'stocks';
            this.openStock(code);
        } else if (hash.startsWith('#/investor/')) {
            const name = decodeURIComponent(hash.slice(11));
            this.currentTab = 'investors';
            this.openInvestor(name);
        } else if (hash.startsWith('#/pro/')) {
            const why = hash.slice(6) || 'general';
            this.openPro(why);
        } else if (hash === '#/faq') {
            this.setTab('faq');
        } else if (hash === '#/analytics') {
            this.setTab('analytics');
        } else if (hash === '#/investors') {
            this.setTab('investors');
        } else if (hash === '#/stocks') {
            this.setTab('stocks');
        }
    }
};

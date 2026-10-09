// Charting module: Chart.js retired, ECharts lazy-loaded for Whale Map on demand

let echartsLoadingPromise = null;

export async function loadECharts() {
    if (window.echarts) return window.echarts;
    if (echartsLoadingPromise) return echartsLoadingPromise;

    echartsLoadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/assets/vendor/echarts.min.js';
        script.async = true;
        script.onload = () => resolve(window.echarts);
        script.onerror = (err) => {
            echartsLoadingPromise = null;
            reject(err);
        };
        document.head.appendChild(script);
    });

    return echartsLoadingPromise;
}

/**
 * Render force-directed relation map for a stock or investor.
 * Supports both options object: { kind, code, name, holders, holdings, stockMap, investorMap, onRetry }
 * and legacy positional: (container, code, holders, stockMap, investorMap, onRetry)
 */
export async function renderWhaleChart(container, targetOrOptions, holdersOrHoldings, stockMapArg, investorMapArg, onRetryArg) {
    if (!container) return null;

    let kind = 'stock';
    let code = '';
    let name = '';
    let holders = [];
    let holdings = [];
    let stockMap = stockMapArg || {};
    let investorMap = investorMapArg || {};
    let onRetry = onRetryArg;

    if (typeof targetOrOptions === 'object' && targetOrOptions !== null) {
        kind = targetOrOptions.kind || 'stock';
        code = targetOrOptions.code || '';
        name = targetOrOptions.name || '';
        holders = targetOrOptions.holders || [];
        holdings = targetOrOptions.holdings || [];
        stockMap = targetOrOptions.stockMap || stockMap;
        investorMap = targetOrOptions.investorMap || investorMap;
        onRetry = targetOrOptions.onRetry || onRetry;
    } else if (typeof targetOrOptions === 'string') {
        if (targetOrOptions === 'investor') {
            kind = 'investor';
            name = typeof holdersOrHoldings === 'string' ? holdersOrHoldings : '';
            holdings = Array.isArray(stockMapArg) ? stockMapArg : (investorMap[name]?.holdings || []);
        } else if (targetOrOptions === 'stock') {
            kind = 'stock';
            code = typeof holdersOrHoldings === 'string' ? holdersOrHoldings : '';
            holders = Array.isArray(stockMapArg) ? stockMapArg : (stockMap[code]?.holders || []);
        } else {
            kind = 'stock';
            code = targetOrOptions;
            holders = Array.isArray(holdersOrHoldings) ? holdersOrHoldings : [];
        }
    }

    // UX: Show loading state inside the box while ECharts script / rendering loads
    container.innerHTML = `
        <div class="whale-loading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--ink3);font-size:13px;gap:8px;background:var(--card);z-index:2">
            <svg class="spin" style="width:20px;height:20px;animation:spin 1s linear infinite" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-linecap="round"/></svg>
            <span>Memuat peta relasi...</span>
        </div>
    `;

    try {
        const echarts = await loadECharts();
        if (!echarts) throw new Error('ECharts not available on window');

        container.innerHTML = '';

        let chartInstance = echarts.getInstanceByDom(container);
        if (chartInstance) {
            chartInstance.dispose();
        }
        chartInstance = echarts.init(container);

        const nodes = [];
        const links = [];
        const nodeSet = new Set();
        const linkSet = new Set();

        const addLink = (sourceId, targetId, pct, widthMultiplier = 1) => {
            const edgeKey = `${sourceId}__${targetId}`;
            if (!linkSet.has(edgeKey)) {
                links.push({
                    source: sourceId,
                    target: targetId,
                    value: `${pct.toFixed(2)}%`,
                    lineStyle: {
                        width: Math.max(1.5, Math.min(5, Math.round(pct / 12 * widthMultiplier))),
                        opacity: 0.65
                    }
                });
                linkSet.add(edgeKey);
            }
        };

        if (kind === 'stock') {
            const centerCode = code.toUpperCase();
            const sData = stockMap ? stockMap[centerCode] : null;
            const fullHolders = (holders && holders.length > 0) ? holders : (sData ? sData.holders : []);

            // Central Stock Node
            nodes.push({
                id: 'stk_' + centerCode,
                name: centerCode,
                fullName: sData ? sData.issuer : centerCode,
                category: 1, // Saham
                symbolSize: 48,
                itemStyle: { color: '#0b6e5f', borderColor: '#34d399', borderWidth: 2.5 },
                label: { show: true, position: 'inside', fontWeight: 'bold', fontSize: 13, color: '#ffffff' },
                value: `${fullHolders.length} Pemegang Saham`
            });
            nodeSet.add('stk_' + centerCode);

            // Level 1: Holders of this stock (top 6)
            const topHolders = fullHolders.slice(0, 6);
            for (const h of topHolders) {
                const invName = h.investor;
                const invId = 'inv_' + invName;
                const isLocal = h.local_foreign === 'L';
                const pct = h.percentage || 0;

                if (!nodeSet.has(invId)) {
                    nodes.push({
                        id: invId,
                        name: invName.length > 14 ? invName.slice(0, 12) + '…' : invName,
                        fullName: invName,
                        category: 0, // Investor
                        symbolSize: Math.max(20, Math.min(36, Math.round(18 + pct / 3))),
                        itemStyle: { color: isLocal ? '#8b5cf6' : '#6366f1' },
                        label: { show: true, fontSize: 10 },
                        value: `${pct.toFixed(2)}% (${isLocal ? 'Domestik' : 'Asing'})`
                    });
                    nodeSet.add(invId);
                }

                addLink(invId, 'stk_' + centerCode, pct);

                // Level 2: Top other stocks of this investor
                const invData = investorMap ? investorMap[invName] : null;
                const otherHoldings = invData ? (invData.holdings || invData.stocks || []) : [];
                const topOtherStocks = otherHoldings
                    .filter(item => (item.code || '').toUpperCase() !== centerCode)
                    .slice(0, 2);

                for (const other of topOtherStocks) {
                    const otherCode = (other.code || '').toUpperCase();
                    const otherStkId = 'stk_' + otherCode;
                    const otherPct = other.percentage || other.p || 0;

                    if (!nodeSet.has(otherStkId)) {
                        const otherData = stockMap ? stockMap[otherCode] : null;
                        nodes.push({
                            id: otherStkId,
                            name: otherCode,
                            fullName: otherData ? otherData.issuer : otherCode,
                            category: 1, // Saham
                            symbolSize: 28,
                            itemStyle: { color: '#0b6e5f' },
                            label: { show: true, fontSize: 10 },
                            value: 'Emiten Terkait'
                        });
                        nodeSet.add(otherStkId);
                    }

                    addLink(invId, otherStkId, otherPct, 0.8);
                }
            }
        } else if (kind === 'investor') {
            const centerName = name;
            const invData = investorMap ? investorMap[centerName] : null;
            const fullHoldings = (holdings && holdings.length > 0) ? holdings : (invData ? (invData.holdings || invData.stocks || []) : []);

            // Central Investor Node
            nodes.push({
                id: 'inv_' + centerName,
                name: centerName.length > 22 ? centerName.slice(0, 20) + '...' : centerName,
                fullName: centerName,
                category: 0, // Investor
                symbolSize: 48,
                itemStyle: { color: '#8b5cf6', borderColor: '#d8b4fe', borderWidth: 2.5 },
                label: { show: true, position: 'inside', fontWeight: 'bold', fontSize: 11, color: '#ffffff' },
                value: `${fullHoldings.length} Portofolio Emiten`
            });
            nodeSet.add('inv_' + centerName);

            // Level 1: Stocks held by this investor (top 6)
            const topHoldings = fullHoldings.slice(0, 6);
            for (const item of topHoldings) {
                const stkCode = (item.code || '').toUpperCase();
                const stkId = 'stk_' + stkCode;
                const pct = item.percentage || item.p || 0;
                const sData = stockMap ? stockMap[stkCode] : null;

                if (!nodeSet.has(stkId)) {
                    nodes.push({
                        id: stkId,
                        name: stkCode,
                        fullName: sData ? sData.issuer : stkCode,
                        category: 1, // Saham
                        symbolSize: Math.max(22, Math.min(38, Math.round(18 + pct / 3))),
                        itemStyle: { color: '#0b6e5f' },
                        label: { show: true, fontSize: 10 },
                        value: `${pct.toFixed(2)}%`
                    });
                    nodeSet.add(stkId);
                }

                addLink('inv_' + centerName, stkId, pct);

                // Level 2: Top other holders of this stock
                const otherHolders = sData ? (sData.holders || []) : [];
                const topOtherHolders = otherHolders
                    .filter(h => h.investor !== centerName)
                    .slice(0, 2);

                for (const otherH of topOtherHolders) {
                    const otherInvName = otherH.investor;
                    const otherInvId = 'inv_' + otherInvName;
                    const otherPct = otherH.percentage || 0;
                    const isOtherLocal = otherH.local_foreign === 'L';

                    if (!nodeSet.has(otherInvId)) {
                        nodes.push({
                            id: otherInvId,
                            name: otherInvName.length > 14 ? otherInvName.slice(0, 12) + '…' : otherInvName,
                            fullName: otherInvName,
                            category: 0, // Investor
                            symbolSize: 24,
                            itemStyle: { color: isOtherLocal ? '#8b5cf6' : '#6366f1' },
                            label: { show: true, fontSize: 10 },
                            value: `${otherPct.toFixed(2)}% (${isOtherLocal ? 'Domestik' : 'Asing'})`
                        });
                        nodeSet.add(otherInvId);
                    }

                    addLink(otherInvId, stkId, otherPct, 0.8);
                }
            }
        }

        const isSmall = (container && container.clientWidth && container.clientWidth < 480) ||
                        (typeof window !== 'undefined' && window.innerWidth < 640);
        const isTouch = (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || isSmall;

        const option = {
            backgroundColor: 'transparent',
            animationDuration: 800,
            animationEasingUpdate: 'quinticInOut',
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(21, 24, 29, 0.92)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
                textStyle: { color: '#f8fafc', fontSize: 12 },
                formatter: (params) => {
                    if (params.dataType === 'node') {
                        const cat = params.data.category === 0 ? 'Investor' : 'Emiten Saham';
                        const fn = params.data.fullName || params.data.name;
                        const val = params.data.value ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px">${params.data.value}</div>` : '';
                        return `<div style="font-weight:600;color:${params.data.category === 0 ? '#a78bfa' : '#34d399'}">${cat}</div>
                                <div style="font-weight:bold;margin-top:2px">${fn}</div>${val}`;
                    }
                    if (params.dataType === 'edge') {
                        const sName = params.data.source.replace('inv_', '').replace('stk_', '');
                        const tName = params.data.target.replace('inv_', '').replace('stk_', '');
                        return `<div style="font-weight:600;color:#94a3b8">Porsi Kepemilikan</div>
                                <div style="font-size:12px;margin-top:2px">${sName} → <b>${tName}</b></div>
                                <div style="font-weight:bold;color:#34d399;margin-top:2px">${params.data.value}</div>`;
                    }
                    return '';
                }
            },
            legend: {
                data: ['Investor', 'Saham'],
                textStyle: { color: '#64748b', fontSize: 11 },
                top: 8,
                right: 12,
                icon: 'circle',
                itemWidth: 10,
                itemHeight: 10
            },
            series: [{
                type: 'graph',
                layout: 'force',
                center: ['50%', '50%'],
                categories: [
                    { name: 'Investor', itemStyle: { color: '#8b5cf6' } },
                    { name: 'Saham', itemStyle: { color: '#0b6e5f' } }
                ],
                roam: !isTouch, // Touch-friendly: disable roam on mobile touch to avoid scroll trap
                force: {
                    repulsion: isSmall ? 170 : 210,
                    edgeLength: isSmall ? [54, 82] : [60, 110],
                    gravity: isSmall ? 0.17 : 0.14,
                    friction: 0.65,
                    layoutAnimation: true
                },
                data: nodes,
                links: links,
                emphasis: {
                    focus: 'adjacency',
                    lineStyle: { width: 4 }
                },
                label: {
                    show: true,
                    position: 'bottom',
                    fontSize: 10,
                    color: '#475569',
                    overflow: 'truncate',
                    width: 78
                }
            }]
        };

        chartInstance.setOption(option);

        // Click to navigate
        chartInstance.on('click', (params) => {
            if (params.dataType === 'node') {
                if (params.data.category === 0 && params.data.fullName) {
                    window.location.hash = '#/investor/' + encodeURIComponent(params.data.fullName);
                } else if (params.data.category === 1) {
                    const c = (params.data.id || params.data.name).replace('stk_', '');
                    window.location.hash = '#/saham/' + c;
                }
            }
        });

        // Responsive auto-resize via ResizeObserver
        if (window.ResizeObserver) {
            const ro = new ResizeObserver(() => {
                if (chartInstance && !chartInstance.isDisposed()) {
                    chartInstance.resize();
                }
            });
            ro.observe(container);
        }

        return chartInstance;
    } catch (err) {
        console.error('Failed to load or render ECharts Whale Map:', err);
        container.innerHTML = `
            <div class="whale-error" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;text-align:center;color:var(--ink2);font-size:13px;gap:10px;background:var(--card);z-index:2">
                <span>Gagal memuat visualisasi peta relasi.</span>
                <button type="button" class="btn sec whale-retry-btn" style="font-size:12px;padding:6px 14px;cursor:pointer">Coba Lagi</button>
            </div>
        `;
        const retryBtn = container.querySelector('.whale-retry-btn');
        if (retryBtn && typeof onRetry === 'function') {
            retryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                onRetry();
            });
        }
        return null;
    }
}

// Stubs for backward compatibility
export function renderDashboardCharts() {}
export function renderModalChart() {}

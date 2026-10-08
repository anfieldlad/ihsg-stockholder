// Charting module: Chart.js retired, ECharts lazy-loaded for Whale Map on demand

let echartsLoadingPromise = null;

export async function loadECharts() {
    if (window.echarts) return window.echarts;
    if (echartsLoadingPromise) return echartsLoadingPromise;

    echartsLoadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js';
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
 * Render force-directed relation map for a stock or investor
 */
export async function renderWhaleChart(container, code, holders, stockMap) {
    if (!container) return null;

    try {
        const echarts = await loadECharts();
        let chartInstance = echarts.getInstanceByDom(container);
        if (chartInstance) {
            chartInstance.dispose();
        }
        chartInstance = echarts.init(container);

        const nodes = [];
        const links = [];
        const nodeSet = new Set();

        // Central node
        nodes.push({
            id: code,
            name: code,
            symbolSize: 42,
            itemStyle: { color: '#0b6e5f' },
            label: { show: true, fontWeight: 'bold' }
        });
        nodeSet.add(code);

        // Cap holders to top 5 to keep mobile performance snappy
        const topHolders = (holders || []).slice(0, 5);

        for (const h of topHolders) {
            const investorName = h.investor;
            if (!nodeSet.has(investorName)) {
                nodes.push({
                    id: investorName,
                    name: investorName.length > 20 ? investorName.slice(0, 18) + '...' : investorName,
                    symbolSize: Math.max(18, Math.min(32, Math.round(h.percentage / 2))),
                    itemStyle: { color: h.local_foreign === 'F' || h.local_foreign === 'A' ? '#1f5fbf' : '#34d399' }
                });
                nodeSet.add(investorName);
            }

            links.push({
                source: code,
                target: investorName,
                value: `${h.percentage.toFixed(2)}%`,
                lineStyle: { width: Math.max(1, Math.min(5, Math.round(h.percentage / 15))) }
            });
        }

        const isTouch = window.matchMedia('(pointer: coarse)').matches;

        const option = {
            animationDuration: 1000,
            animationEasingUpdate: 'quinticInOut',
            tooltip: {
                formatter: (params) => {
                    if (params.dataType === 'edge') {
                        return `${params.data.source} ↔ ${params.data.target}: ${params.data.value}`;
                    }
                    return params.data.name;
                }
            },
            series: [{
                type: 'graph',
                layout: 'force',
                roam: !isTouch, // Disable roam on mobile to prevent scroll trap
                force: {
                    repulsion: 160,
                    edgeLength: [60, 120],
                    gravity: 0.1,
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
                    fontSize: 11
                }
            }]
        };

        chartInstance.setOption(option);
        return chartInstance;
    } catch (err) {
        console.error('Failed to load or render ECharts Whale Map:', err);
        container.innerHTML = '<div style="padding:20px;text-align:center;font-size:13px;color:var(--ink3)">Gagal memuat visualisasi peta relasi.</div>';
        return null;
    }
}

// Stubs for backward compatibility
export function renderDashboardCharts() {}
export function renderModalChart() {}

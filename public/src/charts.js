const TYPE_COLORS = {
    CP: '#3b82f6', ID: '#8b5cf6', IB: '#f59e0b', SC: '#06b6d4',
    MF: '#10b981', IS: '#ec4899', PF: '#f97316', OT: '#64748b',
    FD: '#a78bfa', YY: '#34d399'
};

const TYPE_LABELS = {
    CP: 'Corporate', ID: 'Individual', IB: 'Inv. Bank', SC: 'Sekuritas',
    MF: 'Reksa Dana', IS: 'Asuransi', PF: 'Dana Pensiun', OT: 'Lainnya',
    FD: 'Foundation', YY: 'Yayasan'
};

export function renderDashboardCharts(rawData, stockMap) {
    if (!rawData || !rawData.items) return;

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

let modalChartInstance = null;
export function renderModalChart(holders) {
    if (!holders) return;

    if (modalChartInstance) {
        modalChartInstance.destroy();
    }

    const topN = holders.slice(0, 8);
    const otherPct = holders.slice(8).reduce((s, h) => s + h.percentage, 0);
    const labels = topN.map(h => h.investor.length > 25 ? h.investor.substring(0, 25) + '...' : h.investor);
    const chartData = topN.map(h => h.percentage);
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#ec4899', '#f97316'];

    if (otherPct > 0) {
        labels.push('Lainnya');
        chartData.push(Math.round(otherPct * 10) / 10);
        colors.push('#475569');
    }

    const canvas = document.getElementById('modalChart');
    if (!canvas) return;

    modalChartInstance = new Chart(canvas, {
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
}

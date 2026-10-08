// IHSG Storm Utility Functions

export function fmtNum(n) {
    if (n == null || isNaN(n)) return '-';
    if (n >= 1e12) return (n / 1e12).toFixed(1).replace('.', ',') + ' T';
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.', ',') + ' M';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' Jt';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.', ',') + ' Rb';
    return Number(n).toLocaleString('id-ID');
}

export function fmtShares(n) {
    if (n == null || isNaN(n)) return '-';
    return Number(n).toLocaleString('id-ID');
}

export function fmtPrice(n) {
    if (n == null || isNaN(n)) return '-';
    return Number(n).toLocaleString('id-ID');
}

export function fmtRp(n) {
    if (n == null || isNaN(n)) return '-';
    return 'Rp ' + Number(n).toLocaleString('id-ID');
}

export function fmtPct(p) {
    if (p == null || isNaN(p)) return '0,00%';
    return Number(p).toFixed(2).replace('.', ',') + '%';
}

export function fmtChangePct(pct) {
    if (pct == null || pct === 0 || isNaN(pct)) {
        return { text: '0,00%', cls: 'flat' };
    }
    const sign = pct > 0 ? '+' : '';
    const cls = pct > 0 ? 'up' : 'down';
    return {
        text: `${sign}${Number(pct).toFixed(2).replace('.', ',')}%`,
        cls
    };
}

export function toTitleCase(n) {
    if (!n) return '';
    return String(n)
        .replace(/^PT\s+/i, '')
        .split(' ')
        .map(w => {
            if (/^\(?[A-Z]{1,3}\)?$/.test(w)) return w;
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        })
        .join(' ')
        .replace(/Tbk/i, 'Tbk');
}

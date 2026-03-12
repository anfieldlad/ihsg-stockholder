export function fmtNum(n) {
    if (n == null) return '-';
    if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString('id-ID');
}

export function fmtShares(n) {
    return n.toLocaleString('id-ID');
}

export function fmtPrice(n) {
    if (n == null) return '-';
    return n.toLocaleString('id-ID');
}

export function fmtChangePct(pct) {
    if (pct == null || pct === 0) return { text: '0.00%', cls: 'text-slate-400' };
    const sign = pct > 0 ? '+' : '';
    const cls = pct > 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10';
    return { text: `${sign}${pct.toFixed(2)}%`, cls };
}

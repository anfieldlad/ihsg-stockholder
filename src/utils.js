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
    if (pct == null || isNaN(pct)) {
        return null;
    }
    const num = Number(pct);
    if (num === 0) {
        return { text: '0,00%', cls: 'flat' };
    }
    const sign = num > 0 ? '+' : '';
    const cls = num > 0 ? 'up' : 'down';
    return {
        text: `${sign}${num.toFixed(2).replace('.', ',')}%`,
        cls
    };
}

export function toTitleCase(n) {
    if (!n) return '';
    let s = String(n).trim();
    // Normalize 'PT.' or 'PT ' with space separator
    s = s.replace(/^PT\.?\s*/i, 'PT ');
    
    const words = s.split(/\s+/).map((w, idx) => {
        if (!w) return '';
        const upper = w.toUpperCase();
        if (upper === 'PT' || upper === 'PT.') return 'PT';
        if (upper === 'TBK' || upper === 'TBK.') return 'Tbk';
        if (upper === 'CV' || upper === 'CV.') return 'CV';
        if (upper === 'UD' || upper === 'UD.') return 'UD';
        if (upper === 'LTD' || upper === 'LTD.') return 'Ltd.';
        if (upper === 'PTE' || upper === 'PTE.') return 'Pte.';
        if (upper === '(PERSERO)') return '(Persero)';
        
        // Minor connecting words in lowercase unless at start of string
        const lower = w.toLowerCase();
        if (idx > 0 && ['of', 'and', 'dan', 'di', 'de', 'the'].includes(lower)) {
            return lower;
        }

        if (/^\(?[A-Z0-9]{1,3}\)?$/.test(w) && !['OF', 'DE', 'DI'].includes(upper)) {
            return w; // Acronyms / short codes
        }
        
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    });
    return words.filter(Boolean).join(' ');
}

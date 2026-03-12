export async function fetchHolderData() {
    try {
        const res = await fetch('shareholder_data.json');
        if (!res.ok) throw new Error('Failed to fetch holder data');
        return await res.json();
    } catch (e) {
        console.error('Data load error:', e);
        throw e;
    }
}

export async function fetchPricesBatch(codes) {
    if (!codes || !codes.length) return {};
    const codesStr = codes.join(',');
    try {
        const res = await fetch(`/api/prices?codes=${codesStr}`);
        if (!res.ok) throw new Error('Batch price fetch failed');
        const data = await res.json();
        return data.prices || {};
    } catch (e) {
        console.warn('Batch price fetch failed:', e);
        return {};
    }
}

export async function fetchSinglePrice(code) {
    try {
        const res = await fetch(`/api/price/${code}`);
        if (!res.ok) throw new Error('Single price fetch failed');
        return await res.json();
    } catch (e) {
        console.warn('Price fetch failed for', code, e);
        return null;
    }
}

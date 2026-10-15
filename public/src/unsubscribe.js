// public/src/unsubscribe.js - public one-tap unsubscribe page logic (WL-4, P2 UI; page is not linked from the app).
// Spec: design.md section 9. GET never mutates (mail scanners prefetch links); only the button POSTs.
import { COPY } from './copy.js';

export function readToken(search) {
  try {
    const t = new URLSearchParams(search || '').get('t');
    return t && t.length <= 512 ? t : null;
  } catch (_) {
    return null;
  }
}

// state: confirm | done | bad | error
export function viewFor(state) {
  const U = COPY.watchlist.unsub;
  if (state === 'done') return { title: U.done_title, body: U.done_body, primary: null, secondary: U.open_app };
  if (state === 'bad') return { title: U.bad_title, body: U.bad_body, primary: null, secondary: U.open_app };
  if (state === 'error') return { title: U.title, body: U.body, error: U.error, primary: U.confirm, secondary: U.cancel };
  return { title: U.title, body: U.body, primary: U.confirm, secondary: U.cancel };
}

// 200 -> done, 400 -> bad token, anything else (incl. network) -> error (retry allowed).
export async function submitUnsubscribe(token, fetchImpl = fetch) {
  if (!token) return 'bad';
  try {
    const res = await fetchImpl(`/api/v1/watchlist/unsubscribe?t=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'List-Unsubscribe=One-Click'
    });
    if (res.ok) return 'done';
    if (res.status === 400) return 'bad';
    return 'error';
  } catch (_) {
    return 'error';
  }
}

function el(tag, attrs, text) {
  const n = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
  if (text != null) n.textContent = text;
  return n;
}

export function mount(root, token) {
  let busy = false;
  const render = (state) => {
    const v = viewFor(state);
    root.textContent = '';
    const card = el('div', { class: 'un', role: 'region', 'aria-live': 'polite' });
    card.appendChild(el('h1', {}, v.title));
    card.appendChild(el('p', {}, v.body));
    if (v.error) card.appendChild(el('p', { role: 'alert' }, v.error));
    if (v.primary) {
      const b = el('button', { type: 'button', class: 'btn pri', id: 'unGo' }, v.primary);
      b.addEventListener('click', async () => {
        if (busy) return;
        busy = true; b.disabled = true;
        const next = await submitUnsubscribe(token);
        busy = false;
        render(next);
      });
      card.appendChild(b);
    }
    card.appendChild(el('a', { class: 'btn sec', href: '/', id: 'unHome', style: 'display:inline-flex;align-items:center;justify-content:center;text-decoration:none' }, v.secondary));
    root.appendChild(card);
  };
  render(token ? 'confirm' : 'bad');
}

if (typeof document !== 'undefined' && document.getElementById('unRoot')) {
  try {
    if (localStorage.getItem('ihsg-theme') === 'b') document.documentElement.setAttribute('data-theme', 'b');
  } catch (_) { /* storage blocked */ }
  mount(document.getElementById('unRoot'), readToken(location.search));
}

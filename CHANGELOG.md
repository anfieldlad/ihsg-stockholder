# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Pro "Screener Saham" (F5): filter sheet, active-filter chip, summary strip and Free gate preview. New module `public/src/screener.js`, test `tests/test_screener.js`. Filter controls and chip have 44px touch targets. Known issue: the active Screener chip can be clipped at 375px width (the summary strip still shows the active state).
- Screener (F5) fix: the active filter chip now scrolls fully into view at 375px width (D2 fix; `scrollTo` to its own snap point).
- F1 "Perubahan Kepemilikan Bulanan": new card at the top of the Analitik tab (`#diffCard`) with Top 5 Akumulasi/Distribusi, real counts, source/as-of line, OJK not-advice line and an "indikatif" note for corporate-action/transfer flags. Free (and anonymous) sees the public `/api/v1/diff/summary` aggregate plus a lock card; Pro sees stat tiles and the full "Semua Perubahan" sheet (`#diffSheet`: search, chips incl. Aksi korporasi / Transfer / Pindah nama, type and origin filters, month selectors once 3+ snapshots exist, 100-row pages, row detail with exact shares). Stock sheet and pane gain a `Pemegang Saat Ini | Riwayat Perubahan` toggle. Gate is the single `history_mom` flag from `/me` (every paid tier is "Pro"); the server is the real check. New module `public/src/diff.js`, copy under `COPY.diff`, test `tests/test_f1_diff.js`.

### Changed
- Removed the old "Perubahan antar-bulan" lock/"Sedang dibangun" card (superseded) and the `delta` Pro-gate copy. Pro sheet row now reads "Perubahan antar-bulan: Ringkasan 5 teratas / Lengkap".
- `openPro()` accepts the new keys `diff` and `diff_ticker` (analytics `locked_click` feature).

### Fixed
- `tests/test_qa_suite.js` no longer fails with "window.matchMedia is not a function": the Node test harness now stubs `window.matchMedia` (plus `scrollTo`, `querySelector`, and URL-updating `history`), and the stale assertions that sat behind it (renamed store API, filter keys, search terms, CSS breakpoint values) were updated to the current code. Test-only change.
- Stock detail panel and list no longer throw Alpine TypeErrors when a change percentage is null: every `fmtChangePct(...)` result is read with `?.cls` / `?.text`; `tests/test_detail_null_guard.js` now rejects `fmtChangePct(...).cls|text`.

### Added
- Akun sheet (name, email, status, validity, Keluar) opened from the avatar button in the header.
- Inline SVG sparkle icon on the Pro header button to match the Google icon on the sign-in button
- `LICENSE` (proprietary notice, same text as the backend repository).
- `tests/test_repo_clean.py` fails if backend code, Vercel configuration, raw KSEI pdf/xlsx files, or the retired host come back.
- Changelog categories `Deprecated` and `Removed` in `CONTRIBUTING.md` and the pull request template.

### Changed
- Prices and feedback now call the backend directly at `/api/v1/prices`, `/api/v1/prices/<code>`, `/api/v1/feedback/status` and `/api/v1/feedback` (`public/src/api.js`, `public/src/store.js`).
- `worker.js` maps the four legacy paths (`/api/prices`, `/api/price/<code>`, `/api/feedback/status`, `/api/feedback`) to their `/api/v1` equivalents through the `V1_ORIGIN` branch so cached browser copies keep working; any other `/api/*` returns 404 JSON `{"error":"not found"}`. The alias is temporary and is removed in the follow-up cleanup PR.
- `wrangler.json` sets `keep_vars: true` so git-triggered deploys keep dashboard-set variables and secrets such as `ORIGIN_SECRET`.
- Worker tests (`tests/test_worker_proxy.js`, `.py`) rewritten for the alias, the 404 and the absence of an external fallback host.
- Single Pro tier in the UI: the badge says "Pro" (never Investor or Pakar). Signed-in Pro users no longer see the PRO button, any lock card, or the Pro sheet.
- The header no longer flashes "Masuk dengan Google" while a saved session is restored; a neutral placeholder shows until sign-in resolves (at most 8 seconds for a saved session; while returning from the Google redirect it waits until sign-in settles, at most 15 seconds).
- After the Google redirect the header shows your avatar as soon as sign-in is known, with a small skeleton in place of the tier badge until the account check returns.

- Pro sheet now compares only Gratis and Pro with rows that match what exists; removed the Investor and Pakar columns and the "Layanan Berlangganan Segera Hadir" box.
- Pro users see every holder at 1% and above per stock, the full portfolio of every investor and the full investor ranking; free users see the first 20 investors in the ranking.
- Unbuilt features (Screener, Perubahan Antar-Bulan) show a quiet "Sedang dibangun" note for Pro users instead of opening the Pro sheet.
- "Info Pembaruan" now opens a short note about the monthly KSEI data date instead of the Pro sheet.
- Saham table: header "Pemegang Terbesar" is vertically centred and has even spacing on desktop; same fix for the Investor table header.
- Bantuan search now uses the same pill as the global search (icon, radius, inset, placeholder size); Bantuan and Analitik spacing under the subtitle matches Saham; the Bantuan report button fills the card on phones; Analitik bar labels wrap instead of truncating
- Compact header controls: Masuk and PRO are now 32px high (invisible 44px tap area kept) with 10px of air above and below in a 52px bar, equal width on mobile, on mobile and desktop
- Investor, Analitik and Bantuan pages now follow the Saham layout: hidden page title with a one-line meta subtitle, same spacing rhythm, same chip row, same single-card row list
- Analitik cards on mobile merge into one divided card; FAQ becomes a divided list card; FAQ search field matches the 36px search field; the FAQ contact box matches the Pro lock cards
- Investor rows use the Saham row type scale (16px name, 15px count)
- Rebalance the mobile header: 56px bar, 32px logo, 36px visual buttons with a preserved 44px tap area
- Reserve the scrollbar gutter only on desktop so mobile content gutters are symmetric (16px both sides)
- Size bottom padding from the real bottom-nav height plus safe-area, and add scroll-padding so the last row clears the nav
- Add a right-edge fade on the mobile filter-chip row as a scroll hint
- Standardize button family geometry (44px min-height, 8px radius, 1px border, Manrope 14px/600) across primary, secondary, Google sign-in (`.auth-btn`), and Pro (`.pro`) buttons
- Implement UI consistency v3 styling across tabs, desktop pane, bottom sheets, form controls, search palette, and status feedback states
- Enforce visible form focus rings and accessible WCAG AA contrast tokens for light and dark themes
- README rewritten to the shared nine-section structure used by the backend repository. The monthly data build now lives in the backend repository; this repository only receives `public/shareholder_data.json`.
- CSP tests (`tests/test_auth_config.py`, `tests/test_csp_browser.py`, `tests/test_auth.js`, `tests/verify_files.js`) read `public/_headers` instead of `vercel.json`; `requirements-dev.txt` is standalone (pytest, playwright); `.gitignore` drops Python-server leftovers.
- The Flask API tests in `tests/test_api_endpoints.py` are gone; its Node-subprocess checks moved to `tests/test_frontend_node.py`.
- Bantuan FAQ answers no longer name the removed pipeline scripts.

### Removed
- Legacy Flask API (`server.py`, `api/`), Vercel configuration (`vercel.json`), and the unused Python dependencies (`requirements.txt`, `requirements-ingest.txt`). Prices and feedback are served by the backend under `/api/v1`.
- Raw KSEI PDF and xlsx files, the investor normalizer, parser overrides, the old data build script, and one-off debug and bootstrap scripts. Raw IDX files are not stored in git; the history keeps them.
- Tests that only covered removed code (`tests/test_feedback_api.py`, `tests/test_normalize.py`, `tests/test_update_data.py`) and the stale root `test_csp_browser.py`.
- The `ihsg.badai.tech` (Vercel) fallback in `worker.js`, including the Host override. The Worker no longer calls any external host except the Firebase auth upstream and `V1_ORIGIN`.

### Fixed
- Detail panels no longer throw `Cannot read properties of null (reading 'changePct')` while `detailStock`/`detailInvestor` is null: every access in `public/index.html` now uses optional chaining; guarded by `tests/test_detail_null_guard.js`.
- After returning from Google sign-in the header no longer shows "Masuk dengan Google" until a manual refresh: the time-boxes no longer apply to a pending redirect (15 second cap, then Masuk plus "Login gagal, coba lagi"), the avatar shows as soon as the user is known instead of after /api/v1/me, and the account check runs once per sign-in instead of twice.
- App startup (`init()`) ran twice because Alpine auto-calls it and `index.html` also had `x-init="init()"`; the second run lost the redirect-pending flag and armed the 8 second hint time-box, so "Masuk dengan Google" flashed at about 8 seconds on slow phones. `x-init` is removed, `init()` is idempotent (the "Coba Lagi" button now calls `loadData()`), and the redirect-pending decision is latched once in `auth.js`. Page-view, keyboard and online/offline listeners, price fetch and feedback status now also run once per load.
- Fix Google sign-in redirect and cross-origin storage partitioning by proxying `/__/auth/*` and `/__/firebase/*` through `worker.js` and configuring `authDomain` to `ihsg.bad.ai.id`
- Restore Firebase authentication session on page reload using lightweight hint key (`ihsg_auth_hint`) without storing tokens or PII
- Handle `/api/v1/me` service unavailability gracefully: keep user authenticated with default Gratis tier when `/me` fails
- Surface Google login and redirect errors with Indonesian toast notification ("Login gagal, coba lagi")
- Fix Google sign-in: replace placeholder Firebase API key
- The KSEI data date no longer appears twice on desktop (Saham meta-line, Analitik header); one instance per tab
- Investor row category badge no longer clipped by long category names (the type truncates, the badge stays); long investor names clamp to 2 lines

### Security
- The `/__/auth/*` and `/__/firebase/*` proxy now drops the request `cookie` and `authorization` headers and the response `set-cookie` header.
- Strict edge proxy routing in `worker.js` for `/__/auth/*` and `/__/firebase/*` with hardcoded upstream host, sanitized internal headers (stripping `X-Origin-Auth`), and zero token/PII persistence in local storage

### Data

## [2026-10-10] - Minimalist Mobile UI & Cloudflare Worker Auth Integration

### Added
- Akun sheet (name, email, status, validity, Keluar) opened from the avatar button in the header.
- Minimalist mobile UI layout with condensed metadata above-the-fold display (b1f8598)
- Google sign-in UI and lazy-loaded Firebase authentication bundle (9cc499a)
- Cloudflare Worker reverse proxy route forwarding `/api/v1/` to VPS origin behind V1_ORIGIN flag (69b55a2)

### Changed
- Enable Google sign-in feature flag by default in production (1dfec50)
- Merge minimalist mobile UI redesign and metadata consolidation into main (5419158)

### Fixed
- Expand mobile search bar to full viewport width (ec91b2b)

### Security
- Allow Google API and Firebase authentication origins in Content Security Policy (ec91b2b)

## [2026-10-09] - Cloudflare Worker API Proxy, SEO Phase 0 & UI Polish

### Added
- Akun sheet (name, email, status, validity, Keluar) opened from the avatar button in the header.
- Cloudflare Worker reverse proxy script `worker.js` and `wrangler.json` for edge routing (eae2ff8)
- Backend origin proxy route `/api/v1/*` behind V1_ORIGIN feature flag (c80c5c0)
- Google login modal dialog and lazy-loaded Firebase authentication bundle with flag disabled (8c3ba21)
- SEO Phase 0 baseline including Open Graph images, sitemap lastmod timestamps, and single SITE_URL constant (fd7e53c)
- Brand header, desktop navigation rail wordmark, mobile top bar, and application tagline (09f574d)
- Cookieless Umami privacy analytics with conversion funnel tracking and Respect Do Not Track support (76cd47c)
- Custom `feedback_submit` analytics event and 80k alert threshold monitoring (7d25e8e)
- Automated Playwright screenshot utility `capture_brand_shots.py` and test runner configuration (a9f7384)
- Polished Whale Map visual styling and friendly data loading error copy (359a413)

### Changed
- Merge Cloudflare Worker API proxy branch into main (8351ea7)
- Update production canonical host to `https://ihsg.bad.ai.id` and regenerate SEO metadata (912bdb4)
- Merge release candidate branch `release/ui-fixes-1` containing UI, brand, and analytics improvements into main (699c9d4)
- Merge privacy analytics feature branch into release candidate (bf659ab)
- Merge brand header styling branch into release candidate (855d68a)
- Merge detail pane scroll fix into release candidate (19ca43e)
- Merge mobile Whale Map fix into release candidate (8e7d5dd)
- Merge neutral loading panel state into release candidate (e692374)
- Configure production Umami analytics website identifier (78e67d9)
- Permit Cloudflare Worker upstream proxy references in test_site_config test suite (0b79bcf)
- Merge contact email migration branch into main (eb07bdd)
- Merge security hotfix branch `hotfix/m0-public-root` into main (b4c3e48)

### Fixed
- Add scroll padding and symmetrical touch-friendly dimensions for mobile filter chips (0b9c072)
- Restore scrolling functionality in desktop detail sidebar pane (5999112)
- Resolve blank mobile Whale Map display and render investor relationship graph (9eb1003)
- Replace premature 3-second error popup with persistent neutral loading panel (5015422)
- Update support contact address to `support@bad.ai.id` and fix outdated links in README (d643cf0)

### Security
- Move web root to `public/`, lock down `/api` routing, and install source code leak guards (39e642c)
- Strip `x-real-ip` and untrusted forwarded client headers in Cloudflare Worker proxy (9a0105b)

## [2026-10-08] - IHSG Storm v2.0 UI Overhaul & September 2026 Data Migration

### Added
- Akun sheet (name, email, status, validity, Keluar) opened from the avatar button in the header.
- Modern foundation layout shell, CSS design tokens, custom typography, and scoped styling (ead6ec4)
- Alpine.js reactive state architecture, master-detail side pane, and freemium subscription gating (0a1fcb1)
- Customer support feedback widget modal and interactive FAQ accordion tab (4f55902)
- Integration test suite ensuring static asset validity and eliminating legacy CDN dependencies (69b6987)

### Changed
- Release IHSG Storm v2 with Alpine.js overhaul, data QA remediation, and feedback capabilities (78c897f)
- Replace Chart.js with lightweight pure-CSS bar charts and lazy-loaded Apache ECharts (e5311f8)
- Update deployment asset verification script `verify_files.js` for v2 structure (9ff9a10)

### Fixed
- Set desktop sidebar breakpoint to 1200px and center table layout at 1024px (debe0b7)
- Resolve table header grid wrapping, empty pane fallback, toolbar overlaps, and contrast (13df4ca)
- Handle missing stock price changes with skeleton loading instead of showing misleading 0.00% (820166c)
- Correct AADI maximum shareholder ownership calculation (41.1%) and sort holders descending (fe288e4)
- Fix ES module import path mismatch and add browser compatibility fallback notice (7b25d0c)
- Route Vercel API rewrites directly to `/api/index` serverless function handler (ea30f59)
- Resolve data defect backlog identified during September 2026 quality audit (bece069)
- Eliminate release-blocking layout defects across mobile and desktop views (bfcf1f2)

### Security
- Allow required inline script execution under Content Security Policy while locking down external origins (68da75f)

### Data
- Update shareholder dataset to September 2026 and transition parser to official IDX XLSX format (f7175a7)

## [2026-06-10] - May 2026 Shareholder Data & Parser Robustness

### Fixed
- Recover concatenated table tokens in PDF extraction for issuer, investor, and ownership types (2bc8933)

### Data
- Ingest May 2026 shareholder disclosure dataset and adapt extraction logic to updated IDX report layout (3affbc8)

## [2026-05-18] - March 2026 Supplemental Shareholder Data

### Data
- Ingest supplemental March 2026 shareholder disclosure filings and archive raw source PDFs (9dcbb46)

## [2026-04-13] - Unified Data Pipeline & Chart Lifecycle Stability

### Changed
- Consolidate redundant PDF download and parsing logic into unified `update_data.py` script (bf6fc03)
- Remove unused legacy files and clean up project structure (f50c9fd)
- Update README documentation with production URL and automated ingestion workflow (ec61ef1)

### Fixed
- Restore missing `yfinance` package dependency to `requirements.txt` (05e61de)
- Prevent canvas reuse errors by destroying existing Chart.js instances before re-rendering (8287a37)

### Data
- Ingest March 2026 shareholder reports and apply baseline SEO enhancements (d6ae23f)

## [2026-03-12] - Whale Relationship Map & Rebranding to IHSG Storm

### Added
- Akun sheet (name, email, status, validity, Keluar) opened from the avatar button in the header.
- Interactive Whale Relationship Map visualization powered by Apache ECharts (bf0d2c6)
- Application favicon asset (c101681)

### Changed
- Rebrand platform to IHSG Storm and redesign navigation header (3c2b838)
- Modularize monolithic HTML template into reusable component partials (693ad8e)
- Relocate Whale Relationship Map into dedicated modal dialog structure (9f3fb7b)
- Reorganize static asset directory structure and configure Vercel static routing (fb9342e)
- Update page title metadata and standardize HTML document formatting (e9d8072)

### Fixed
- Eliminate header overflow clipping to allow autocomplete search dropdown visibility (a7488f2)
- Improve dropdown selector usability on mobile devices (bfebb71)
- Correct Vercel deployment routing configuration for public directory assets (6456a57)

## [2026-03-04] - Initial Launch: IHSG Stockholder Dashboard

### Added
- Akun sheet (name, email, status, validity, Keluar) opened from the avatar button in the header.
- Initial release of IHSG Stockholder Dashboard single-page application with live price feeds (c259b5f)
- Instant in-memory autocomplete search dropdown for listed tickers and major investors (e7774f1)
- Responsive mobile layout featuring stacked card grids and horizontal table scrolling (662b93a)
- Initial project README and Vercel serverless deployment configuration (765800a)

### Changed
- Format header disclaimer notes across two separate lines for readability (abfa60e)
- Adapt yfinance integration to v1.0 library standards by removing custom requests session (6a2ab41)

### Fixed
- Upgrade yfinance to v1.0+ to bypass Yahoo Finance cookie consent restrictions on Vercel (05fb03a)
- Implement custom HTTP session headers and User-Agent to resolve Vercel price fetch failures (2b7caba)

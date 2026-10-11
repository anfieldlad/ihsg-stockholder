# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Inline SVG sparkle icon on the Pro header button to match the Google icon on the sign-in button

### Changed
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

### Fixed
- The KSEI data date no longer appears twice on desktop (Saham meta-line, Analitik header); one instance per tab
- Investor row category badge no longer clipped by long category names (the type truncates, the badge stays); long investor names clamp to 2 lines

### Security

### Data

## [2026-10-10] - Minimalist Mobile UI & Cloudflare Worker Auth Integration

### Added
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

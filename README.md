# IHSG Storm (frontend)

## 1. Overview

IHSG Storm shows who owns what on the Indonesia Stock Exchange. It reads the monthly KSEI list of shareholders above 1 percent and lets you browse it by stock and by investor. It also shows delayed market prices.

Key live features:
- **F1 (Perubahan Antar-Bulan / Month-over-Month Diff Engine):** Analitik dashboard card, Pro sheet (all changes), and stock detail 'Riwayat Perubahan' toggle.
- **F5 (Screener Saham Pro):** Multi-criteria client-side filter on tab Saham (Foreign %, Top 1/Top 3 concentration, holder count, institutional tags).
- **Bantuan/FAQ overhaul:** 30 Q&As across 6 categories with dynamic category filtering and live search.

This repository holds the website only: static files, the edge Worker, and the UI tests. It has no server code. The live site is https://ihsg.bad.ai.id.

The data is a monthly snapshot and prices are delayed. This is not investment advice.

## 2. Architecture and how the two repos connect

    Browser
       |
    Cloudflare Worker (worker.js)
       |-- static files from public/
       |-- /api/v1/*  -->  backend origin (repository: ihsg-backend)

- public/ is plain HTML, CSS and JavaScript modules. Alpine.js handles state and ECharts draws charts. Fonts and libraries are vendored under public/assets, so the page loads nothing from a CDN. Modules in public/src/ power client features:
  - diff.js: Month-over-Month Diff Engine (F1) view models, formatting, and row state.
  - screener.js: Screener Saham Pro (F5) multi-criteria filtering, presets, and metrics.
  - copy.js: Copy dictionary including all 30 FAQ Q&As and category definitions.
  - store.js, auth.js, api.js, charts.js, normalize.js: Central Alpine store, authentication, backend API calls, charting, and data normalization.
- worker.js serves public/ and forwards every request under /api/v1/ to the backend origin. It adds a shared secret header and the real client IP. Any other /api/ path returns 404.
- The backend repository (ihsg-backend) owns prices, feedback, Month-over-Month diff data (/api/v1/diff/*), login checks and billing. The browser calls it only through the Worker, so there is no cross-origin traffic.
- public/shareholder_data.json is built by the backend repository's data pipeline and committed here as a plain file.

Pages: Saham (stocks, with Screener Saham Pro), Investor, Analitik (whale map and F1 Diff card/sheet), Bantuan (FAQ with dynamic category filtering and live search). Routing uses the URL hash.

## 3. Local development

You need Node 22 and Python 3.12.

    # serve the static site (prices show n/a without a backend)
    python -m http.server 8000 --directory public

    # or run the Worker locally against a backend on port 8081
    npx wrangler dev --var V1_ORIGIN:http://localhost:8081 --var ORIGIN_SECRET:dev-only

Open http://localhost:8000 (or the port Wrangler prints, 8787 by default).

Site metadata (canonical URL, sitemap, robots, config.js) is generated from site_config.py:

    python scripts/build_site_metadata.py          # write
    python scripts/build_site_metadata.py --check  # verify only

## 4. Tests

    python -m pip install -r requirements-dev.txt
    python -m playwright install chromium     # only for browser tests
    python -m pytest                          # fast tests; browser tests are skipped by default
    for f in tests/test_*.js; do node "$f"; done
    python scripts/leak_guard.py

Key Node test suites for frontend features:
- `tests/test_f1_diff.js`: F1 Diff UI (formatting, row view models, gating, request behavior, and markup guards).
- `tests/test_screener.js`: F5 Screener Saham (multi-criteria filter logic, presets, metrics derivation, and store integration).
- `tests/test_faq.js`: FAQ overhaul (30 Q&As across 6 categories, dynamic category filtering, search, empty state, and 44px touch targets).

Browser tests are run on demand, for example: python -m pytest tests/test_loading_state.py. Run them before changing layout or CSS, and check 375 px wide (phone) and 1024 px wide (desktop).

tests/test_repo_clean.py keeps this repository frontend-only: it fails if backend code, Vercel configuration or raw KSEI files come back.

## 5. Deploy

A merge to main deploys to production on Cloudflare Workers. Do not push to main directly. Work on a branch, open a pull request, and get QA and security approval first. wrangler.json holds the Worker name, the asset folder (public/) and the V1_ORIGIN variable. The secret ORIGIN_SECRET is set in the Cloudflare dashboard and never stored in git.

To roll back, revert the pull request and merge the revert, or use the Cloudflare dashboard to restore the previous version.

## 6. Data update

The monthly file public/shareholder_data.json is produced by the backend repository. Steps:

1. Run the data build in ihsg-backend (see its README, section 6) with --out pointing at this repository's public/shareholder_data.json.
2. Check the summary it prints (row count, data date).
3. Commit on a branch. Add a Data line to CHANGELOG.md. Open a pull request.
4. Merge after QA. The site updates on deploy.

Raw IDX files (xlsx, pdf) are not stored in this repository. After a successful build the raw file can be deleted.

## 7. Config and environment

| Name | Where | Purpose |
|---|---|---|
| V1_ORIGIN | wrangler.json vars | Backend origin URL for /api/v1/* |
| ORIGIN_SECRET | Cloudflare Worker secret | Shared secret sent to the backend as X-Origin-Auth |
| SITE_URL | site_config.py, or environment | Public site URL used for canonical tags and sitemap |
| COMPANY_URL | site_config.py, or environment | Company site URL |
| AUTH_DOMAIN | site_config.py, or environment | Firebase auth domain |

Content-Security-Policy and other security headers live in public/_headers. Change them together with the tests in tests/test_auth_config.py.

## 8. Changelog

See CHANGELOG.md. Every merge that changes product code, data or configuration adds an entry under Unreleased. Format: Keep a Changelog.

## 9. License

Proprietary. All rights reserved. See LICENSE.

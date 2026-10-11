# Contributing to IHSG Storm

Welcome to the IHSG Storm repository. To maintain high engineering discipline, product quality, and traceability across releases, all contributors must follow these guidelines.

## Branching & Release Workflow

- **Never push directly to `main`:** Pushes to `main` trigger immediate production deployments to Cloudflare Workers. Direct pushes to `main` are strictly forbidden.
- **Branches only:** Create isolated feature, fix, or docs branches off `origin/main` (e.g., `feature/...`, `fix/...`, `docs/...`).
- **Release gates:** All changes must pass the OPC two-stage gate before merge:
  - **Angela Gate (QA):** Verifies functionality, responsive layouts, test suite execution, and changelog compliance.
  - **Toby Gate (Security & Governance):** Verifies security posture, headers/CSP compliance, fail-closed mechanics, and absence of credential leaks.
- **Merge authority:** CEO Michael merges approved branches into `main` only after Angela PASS and Toby GO.

## Changelog Rule

Every PR or merge that touches product code, data, or infrastructure **must** add an entry to `CHANGELOG.md` under the `[Unreleased]` section:

- **Categorization:** Group entries under one of the standard sections: `Added`, `Changed`, `Fixed`, `Security`, or `Data`.
- **Monthly Data Updates:** Monthly data updates and data ingestion runs go under the `Data` section.
- **Entry Format:** Plain English, one line per change, with a short commit SHA or PR reference (e.g., `- Concise description (short-sha)`).
- **Mandatory Quality Gate:** **Angela does not PASS any pull request without a valid changelog entry.**

## Quality & Design Standards

- **Mobile First:** Bobby reviews changes on mobile (375px viewport width). Every UI update must look sharp on mobile and clean on desktop (centered, split-pane >=1024px).
- **Minimalism:** Keep design clean, focused, and minimal.
- **Resource Discipline:** The host VPS operates with 2GB RAM. Heavy browser automation is reserved strictly for designated QA runs.
- **Non-Interactive Scripts:** Do not run inline `node -e` or `python -c` in automation; always commit reproducible script files.
- **Automated Verification:** Run the test suite (`pytest`) and ensure all checks pass before requesting review.
- **Zero Secrets:** Never commit sensitive credentials, API keys, or private environment variables.

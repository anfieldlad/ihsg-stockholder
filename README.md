# IHSG Storm (IHSG Stock Tracking & Ownership Real-time Monitoring) 📉🚀🤖

A lightweight, component-driven dashboard that parses shareholder data from KSEI (Indonesia Stock Exchange ownership data) and displays it alongside live market prices.

**Live Demo:** [https://ihsg.badai.tech/](https://ihsg.badai.tech/)

## Features
- **Top Investors:** See who owns what in the Indonesian market (ownership > 1%).
- **Live Prices:** Pings Yahoo Finance to get live stock prices (delayed ~15 mins) and dynamically calculates portfolio valuations.
- **Fast Search:** Client-side autocomplete for instant matching of stocks and investor names.
- **Automated Data Updates:** Unified script to fetch the latest PDF from IDX, archive the old one, and parse it into JSON.
- **SEO Optimized:** Comprehensive meta tags, Open Graph, Twitter Cards, and JSON-LD structured data.

## Tech Stack
- **Frontend:**
  - **Alpine.js:** Reactive templating and state management (~10kB).
  - **Tailwind CSS:** Utility-first styling via CDN.
  - **ECharts / Chart.js:** Interactive visualizations.
- **Backend:** 
  - **Flask:** Python API proxying market data and serving the dashboard.
- **Automation:**
  - **Playwright:** Headless browser to bypass anti-bot protection on IDX.
  - **pdfplumber:** Robust PDF table extraction.

## Local Development

### 1. Setup Environment
```bash
# Install dependencies
pip install -r requirements.txt

# Install Playwright browser
python -m playwright install chromium
```

### 2. Update Data
To update to the latest shareholder data from IDX/KSEI:
```bash
python scripts/update_data.py
```
*This script will check if an update is needed, download the latest PDF from IDX, archive the old version, and parse the data into JSON.*

### 3. Run Server
```bash
python server.py
```
Open [http://localhost:5000](http://localhost:5000) in your browser.

## Deployment (Vercel)
The application is pre-configured to run as a serverless project on Vercel. 
- Python Flask backend runs via `api/index.py`.
- Static files are served from the root.

## Disclaimer
Do not use this for actual financial decisions. The pricing data is delayed and the static ownership data is just a snapshot.

---
Crafted with ❤️ by [BAD AI](https://badai.tech)

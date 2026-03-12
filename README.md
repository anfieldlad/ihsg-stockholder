# IHSG Storm (IHSG Stock Tracking & Ownership Real-time Monitoring) 📉🚀🤖

A lightweight, component-driven dashboard that parses static JSON data from KSEI (Indonesia Stock Exchange ownership data) and displays it alongside live market prices.

## Features
- **Top Investors:** See who owns what in the Indonesian market.
- **Live Prices:** Pings Yahoo Finance to get live stock prices (delayed ~15 mins) and dynamically calculates portfolio valuations.
- **Fast Search:** Client-side autocomplete for instant matching of stocks and investor names.
- **Responsive UI:** Dark-mode interface optimized for both desktop and varying screen sizes.

## Tech Stack
This application eschews heavy build tools (like Vite/Webpack) in favor of a lean, CDN-delivered frontend and a typed Python backend.

- **Frontend:**
  - **Alpine.js:** Provides Vue/React-like declarative templating (`x-data`, `x-for`) directly in the HTML without a Virtual DOM overhead (~10kB).
  - **Tailwind CSS:** Utility-first CSS framework loaded via CDN for rapid, consistent styling.
  - **Vanilla ES6 Modules:** State management and API logic are cleanly separated into `src/store.js`, `src/api.js`, `src/utils.js`, and `src/charts.js`.
- **Backend:** 
  - **Flask (Serverless-ready):** A lightweight Python API proxying Yahoo Finance requests to bypass CORS limitations, now fully type-hinted for better maintainability.

## Deployment (Vercel)
The application is pre-configured to run as a serverless project on Vercel. 
The Python Flask backend runs as a Serverless Function via `api/index.py`, utilizing `vercel.json` rewrites. 
Just connect the repository to Vercel and it deploys automatically.

## Local Dev
1. Install dependencies: `pip install -r requirements.txt`
2. Run the server: `python server.py`
3. Open `http://localhost:5000` in your browser.

## Disclaimer
Do not use this for actual financial decisions. The pricing data is delayed and the static ownership data is just a snapshot.

# IHSG Stockholder Dashboard

A powerful, interactive Single Page Application (SPA) dashboard for analyzing stockholder data from the Indonesia Stock Exchange (BEI/IDX). 

The dashboard provides real-time insights into top investors, stock ownership percentages, and live market valuations.

## Features

- **Dashboard View:** High-level market statistics including total records, total investors (>1% ownership), and local vs foreign ownership ratios.
- **Top Investors Directory:** Browse the largest stakeholders in the Indonesian market. Click on any investor to view their full portfolio.
- **Live Stock Valuations:** Integration with Yahoo Finance to pull live stock prices (15-minute delay) and calculate real-time portfolio valuations for investors.
- **Full-Page Navigation:** Seamless, Hash-based Single Page Application (SPA) routing allows you to navigate between the main dashboard, specific investor portfolios (`#/investor/NAME`), and individual stock holder details (`#/stock/CODE`) without reloading.
- **Interactive UI:** Smooth transitions, glassmorphism aesthetics, and responsive design for all screen sizes.

## Architecture

- **Frontend:** HTML5, CSS3 (Custom Properties, Glassmorphism), Vanilla JavaScript (No frameworks).
- **Backend:** Python + Flask (Serves the application and acts as an API proxy).
- **Data Integration:** 
  - Static KSEI ownership data (`data/raw.json`).
  - Live Pricing API via `yfinance`.

## Running Locally

1. Ensure you have Python 3.8+ installed.
2. Install the required backend dependency:
   ```bash
   pip install yfinance flask flask-cors
   ```
3. Start the Flask server:
   ```bash
   python server.py
   ```
4. Open your browser and navigate to: [http://localhost:5000](http://localhost:5000)

## API Endpoints (Backend)

The included Python server provides the following endpoints to proxy Yahoo finance and circumvent CORS/rate-limits:
- `GET /api/price/<CODE>`: Fetch current price for a single stock.
- `GET /api/prices?codes=BBCA,GOTO`: Batch fetch prices for multiple stocks.
- `GET /api/cache/stats`: View the status of the 5-minute in-memory price cache.

## Disclaimer
Data provided is for informational purposes only. The application relies on static ownership data and delayed pricing data from Yahoo Finance.

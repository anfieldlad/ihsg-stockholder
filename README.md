# IHSG Stockholder Dashboard 📉🚀🤖

⚠️ **WARNING: This is 100% pure AI SLOP!** ⚠️

Let's be real here: this is **NOT** a proper application. There is no clean code, there is no robust architecture, and it's definitely not following SOLID principles. It's a quick, hacky Single Page Application (SPA) built entirely by AI just for fun. 

## What does it do?
It's a dashboard that parses static JSON data from KSEI (Indonesia Stock Exchange ownership data) and displays it.
- **Top Investors:** See who owns what in the Indonesian market.
- **Live Prices (Sort of):** It pings Yahoo Finance to get live stock prices (delayed ~15 mins) and dynamically calculates portfolio valuations.
- **Hash Routing:** It uses old-school `#/stock/GOTO` url hashes to pretend it's a multi-page app without actually reloading.

## Tech "Stack"
- **Frontend:** HTML, Vanilla CSS (glassmorphism because why not), and one massive `app.js` file holding on for dear life.
- **Backend:** A tiny Flask server that acts as an API proxy for Yahoo Finance so we don't get CORS-blocked.

## Deployment (Vercel)
Yes, this AI slop can actually be deployed to Vercel! 
The Python Flask backend runs as a Serverless Function via `api/index.py`. 
Just connect the repo to Vercel and it should "just work" (fingers crossed).

## Local Dev
If you really want to run this locally:
1. `pip install -r requirements.txt` (or just `pip install yfinance flask flask-cors`)
2. `python server.py`
3. Pray.
4. Open `http://localhost:5000`

## Disclaimer
Do not use this for actual financial decisions. It's built by an AI that doesn't care if you lose all your money. The pricing data is delayed and the static ownership data is just a snapshot. 

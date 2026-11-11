# MDOS

MDOS (Market Data Operating System) is a black terminal-style market data collection tool for NSE India.

## Features

- Black background + green terminal aesthetic
- Quick command presets for Nifty, Bank Nifty, FinNifty, and Nifty Monthly
- Step tracker while the system compiles data
- Plain-text institutional data sheet
- Manual edit fallback for any NA values
- Copy button with clipboard fallback
- Claude integration using the `claude-sonnet-4-6` model and `web_search_20250305`

## Local development

1. Install dependencies:
   npm install
2. Add your Anthropic key to `.env`:
   ANTHROPIC_API_KEY=your_key_here
   PORT=3001
3. Start the app:
   npm run dev
4. Open http://localhost:5173

## Production deployment

This project includes a Render config in `render.yaml`.

## Important

This app requires a valid Anthropic API key to fetch live data. Without it, the backend will return a configuration error instead of guessed market data.

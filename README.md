# FlowRate Currency Converter

A polished, portfolio-quality currency converter built with semantic HTML, modular CSS, and clean vanilla JavaScript.

FlowRate is designed to feel like a practical fintech product rather than a basic demo, with strong visual design, responsive UX, and robust error handling.

## Live Demo

https://chliop.github.io/CurrencyConverter/

## Highlights

- Real-time currency conversion
- Searchable currency selectors (code + name)
- Swap currencies instantly
- Quick amount chips (`1`, `10`, `100`, `500`, `1000`)
- Exchange rate + inverse rate details
- Copy converted result to clipboard
- Conversion history with local persistence
- Dark/light mode toggle with local persistence
- Loading and friendly error states
- Fallback API handling for resilience

## Tech Stack

- HTML5 (semantic structure)
- CSS3 (modular styling + responsive layout)
- Vanilla JavaScript (state-driven UI logic)
- ExchangeRate API (primary source)
- Frankfurter API (fallback source)

## Project Structure

```text
CurrencyConverter/
├── index.html
├── style.css
└── script.js
```

## How It Works

1. App initializes theme and saved settings from `localStorage`.
2. Currency list is built from available exchange rates.
3. Rates are fetched and cached (with expiration) for better performance.
4. Conversion updates on input changes and explicit convert actions.
5. History and preferences are stored locally for better continuity.

## Local Setup

1. Clone the repository:
   ```bash
   git clone git@github.com:ChlioP/CurrencyConverter.git
   cd CurrencyConverter
   ```
2. Open `index.html` in your browser.

No build tools required.

## API Notes

Primary endpoint format:

```text
https://v6.exchangerate-api.com/v6/YOUR_API_KEY/latest/USD
```

If the primary provider fails, the app falls back to:

```text
https://api.frankfurter.app/latest?from=USD
```

## UX and Design Goals

- Sleek, minimal, fintech-inspired visual language
- Clear hierarchy and balanced spacing
- Soft shadows, rounded cards, subtle gradients
- Mobile-first responsiveness
- Friendly UI feedback for validation and failures

## Future Upgrades

- Historical trend charts per currency pair
- Favorites/pinned currency pairs
- PWA support for offline-first experience
- Unit tests for conversion and persistence logic
- Optional backend proxy for API key management

## License

This project is open for personal learning and portfolio use.

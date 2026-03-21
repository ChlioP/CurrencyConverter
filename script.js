const STORAGE_KEYS = {
  theme: "flowrate_theme",
  settings: "flowrate_settings",
  history: "flowrate_history",
  ratesCache: "flowrate_rates_cache"
};

const API_KEY = "ccc3e7abde53192f6c376238";
const MAX_HISTORY = 8;
const CACHE_MAX_AGE_MS = 1000 * 60 * 30;

const fallbackMajorCurrencies = [
  "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "NZD", "SEK", "NOK", "MXN", "SGD", "HKD", "BRL"
];

const state = {
  currencies: [],
  currencyNameMap: {},
  rates: {},
  amount: 1,
  from: "USD",
  to: "EUR",
  isLoading: false,
  lastUpdated: null,
  history: []
};

const els = {
  form: document.getElementById("converter-form"),
  amountInput: document.getElementById("amount"),
  amountFeedback: document.getElementById("amount-feedback"),
  fromSelect: document.getElementById("from-currency"),
  toSelect: document.getElementById("to-currency"),
  fromSearch: document.getElementById("from-search"),
  toSearch: document.getElementById("to-search"),
  swapBtn: document.getElementById("swap-btn"),
  convertBtn: document.getElementById("convert-btn"),
  copyBtn: document.getElementById("copy-btn"),
  quickAmounts: Array.from(document.querySelectorAll(".chip[data-amount]")),
  resultValue: document.getElementById("result-value"),
  rateDetails: document.getElementById("rate-details"),
  statusText: document.getElementById("status-text"),
  errorBanner: document.getElementById("error-banner"),
  historyList: document.getElementById("history-list"),
  clearHistoryBtn: document.getElementById("clear-history"),
  themeToggle: document.getElementById("theme-toggle"),
  footerYear: document.getElementById("year")
};

init();

async function init() {
  els.footerYear.textContent = new Date().getFullYear();
  applySavedTheme();
  hydrateSavedState();
  wireEvents();

  try {
    setStatus("loading", "Loading currencies...");
    await loadCurrencies();
    renderCurrencySelects();
    setStatus("loading", "Loading exchange rates...");
    await ensureRatesForBase(state.from);
    convertAndRender({ saveToHistory: false });
    setStatus("success", "Live rates ready");
  } catch (error) {
    handleError(error, "Could not initialize converter. Please retry.");
  }
}

function wireEvents() {
  els.form.addEventListener("submit", onFormSubmit);
  els.amountInput.addEventListener("input", onAmountInput);
  els.fromSelect.addEventListener("change", onCurrencyChange);
  els.toSelect.addEventListener("change", onCurrencyChange);
  els.fromSearch.addEventListener("input", () => filterSelectOptions("from"));
  els.toSearch.addEventListener("input", () => filterSelectOptions("to"));
  els.swapBtn.addEventListener("click", onSwap);
  els.copyBtn.addEventListener("click", copyResult);
  els.clearHistoryBtn.addEventListener("click", clearHistory);
  els.themeToggle.addEventListener("click", toggleTheme);

  els.quickAmounts.forEach((button) => {
    button.addEventListener("click", () => {
      const quickAmount = Number(button.dataset.amount);
      state.amount = quickAmount;
      els.amountInput.value = quickAmount;
      clearAmountFeedback();
      convertAndRender({ saveToHistory: true });
      persistSettings();
    });
  });
}

async function loadCurrencies() {
  const fromCache = getRatesCache("USD");
  let codes = [];

  if (fromCache && fromCache.rates) {
    codes = Object.keys(fromCache.rates);
  } else {
    const data = await fetchRatesFromProviders("USD");
    if (!data || !data.rates) {
      throw new Error("Unable to load currency list from provider");
    }
    codes = Object.keys(data.rates);
    cacheRates("USD", data.rates, data.updatedAt);
  }

  if (!codes.includes("USD")) {
    codes.push("USD");
  }

  state.currencyNameMap = buildCurrencyNameMap(codes);
  state.currencies = codes.sort((a, b) => a.localeCompare(b));

  if (!state.currencies.includes(state.from)) {
    state.from = "USD";
  }
  if (!state.currencies.includes(state.to)) {
    state.to = "EUR";
  }
}

function buildCurrencyNameMap(codes) {
  const map = {};
  const displayNames = typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames([navigator.language || "en-US"], { type: "currency" })
    : null;

  codes.forEach((code) => {
    const name = displayNames ? displayNames.of(code) : code;
    map[code] = name || code;
  });

  fallbackMajorCurrencies.forEach((code) => {
    if (!map[code]) {
      map[code] = code;
    }
  });

  return map;
}

function renderCurrencySelects() {
  renderOptions(els.fromSelect, state.currencies, state.from);
  renderOptions(els.toSelect, state.currencies, state.to);
}

function renderOptions(selectElement, currencies, selectedCode) {
  const options = currencies
    .map((code) => `<option value="${code}">${code} - ${state.currencyNameMap[code] || code}</option>`)
    .join("");

  selectElement.innerHTML = options;
  selectElement.value = selectedCode;
}

function filterSelectOptions(type) {
  const isFrom = type === "from";
  const query = (isFrom ? els.fromSearch.value : els.toSearch.value).trim().toLowerCase();
  const selectElement = isFrom ? els.fromSelect : els.toSelect;
  const selectedCode = isFrom ? state.from : state.to;

  const filtered = state.currencies.filter((code) => {
    const label = `${code} ${state.currencyNameMap[code] || ""}`.toLowerCase();
    return label.includes(query);
  });

  renderOptions(selectElement, filtered.length ? filtered : state.currencies, selectedCode);
}

async function onCurrencyChange(event) {
  const target = event.target;
  const isFrom = target.id === "from-currency";

  if (isFrom) {
    state.from = els.fromSelect.value;
    try {
      await ensureRatesForBase(state.from);
      convertAndRender({ saveToHistory: true });
      persistSettings();
    } catch (error) {
      handleError(error, "Failed to refresh rates for selected base currency.");
    }
    return;
  }

  state.to = els.toSelect.value;
  convertAndRender({ saveToHistory: true });
  persistSettings();
}

async function onFormSubmit(event) {
  event.preventDefault();
  const amount = Number(els.amountInput.value);

  if (!isValidAmount(amount)) {
    showAmountFeedback("Enter an amount greater than 0.");
    return;
  }

  state.amount = amount;

  try {
    setStatus("loading", "Refreshing latest rate...");
    await ensureRatesForBase(state.from, { forceRefresh: true });
    convertAndRender({ saveToHistory: true });
    setStatus("success", "Converted");
    persistSettings();
  } catch (error) {
    handleError(error, "Conversion failed. Please try again.");
  }
}

function onAmountInput() {
  const amount = Number(els.amountInput.value);
  if (!isValidAmount(amount)) {
    showAmountFeedback("Enter an amount greater than 0.");
    return;
  }

  clearAmountFeedback();
  state.amount = amount;
  convertAndRender({ saveToHistory: false });
  persistSettings();
}

function onSwap() {
  const previousFrom = state.from;
  state.from = state.to;
  state.to = previousFrom;

  els.fromSelect.value = state.from;
  els.toSelect.value = state.to;

  ensureRatesForBase(state.from)
    .then(() => {
      convertAndRender({ saveToHistory: true });
      persistSettings();
    })
    .catch((error) => handleError(error, "Could not swap currencies at the moment."));
}

function isValidAmount(value) {
  return Number.isFinite(value) && value > 0;
}

function showAmountFeedback(message) {
  els.amountFeedback.textContent = message;
}

function clearAmountFeedback() {
  els.amountFeedback.textContent = "";
}

async function ensureRatesForBase(base, options = {}) {
  const { forceRefresh = false } = options;

  if (!forceRefresh && state.rates[base]) {
    return;
  }

  const cached = getRatesCache(base);
  if (!forceRefresh && cached && cached.rates) {
    state.rates[base] = cached.rates;
    state.lastUpdated = cached.updatedAt;
    return;
  }

  setLoading(true);
  const data = await fetchRatesFromProviders(base);
  setLoading(false);

  if (!data || !data.rates) {
    throw new Error("No rate data available");
  }

  state.rates[base] = data.rates;
  state.lastUpdated = data.updatedAt || new Date().toISOString();
  cacheRates(base, data.rates, state.lastUpdated);
}

async function fetchRatesFromProviders(base) {
  try {
    return await fetchRatesFromExchangeRateApi(base);
  } catch (primaryError) {
    console.warn("Primary provider failed, using fallback.", primaryError);
    return fetchRatesFromFrankfurter(base);
  }
}

async function fetchRatesFromExchangeRateApi(base) {
  const url = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${base}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`ExchangeRate API HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.result !== "success" || !data.conversion_rates) {
    throw new Error(data["error-type"] || "ExchangeRate API returned invalid payload");
  }

  return {
    rates: data.conversion_rates,
    updatedAt: data.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString() : new Date().toISOString()
  };
}

async function fetchRatesFromFrankfurter(base) {
  const response = await fetch(`https://api.frankfurter.app/latest?from=${base}`);
  if (!response.ok) {
    throw new Error(`Frankfurter API HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data || !data.rates) {
    throw new Error("Frankfurter returned invalid payload");
  }

  const rates = { ...data.rates, [base]: 1 };
  return {
    rates,
    updatedAt: data.date ? new Date(`${data.date}T00:00:00Z`).toISOString() : new Date().toISOString()
  };
}

function convertAndRender(options = {}) {
  const { saveToHistory = false } = options;
  hideError();

  const amount = Number(state.amount);
  const from = state.from;
  const to = state.to;
  const baseRates = state.rates[from];

  if (!baseRates || typeof baseRates[to] !== "number") {
    setStatus("error", "Rate unavailable");
    showError("Rate unavailable for selected currency pair.");
    return;
  }

  if (!isValidAmount(amount)) {
    showAmountFeedback("Enter an amount greater than 0.");
    return;
  }

  clearAmountFeedback();
  const rate = baseRates[to];
  const converted = amount * rate;
  const inverseRate = rate === 0 ? 0 : 1 / rate;

  els.resultValue.textContent = `${formatMoney(converted)} ${to}`;

  const updated = state.lastUpdated
    ? new Date(state.lastUpdated).toLocaleString()
    : "Unknown";

  els.rateDetails.textContent = `1 ${from} = ${formatRate(rate)} ${to} | 1 ${to} = ${formatRate(inverseRate)} ${from} | Updated: ${updated}`;

  if (saveToHistory) {
    pushHistory({ amount, from, to, converted, rate, time: new Date().toISOString() });
  }

  setStatus("success", "Converted");
}

function formatMoney(value) {
  if (!Number.isFinite(value)) {
    return "0.00";
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatRate(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6
  });
}

async function copyResult() {
  const text = els.resultValue.textContent.trim();
  if (!text || text === "0.00") {
    setStatus("error", "Nothing to copy");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus("success", "Result copied");
  } catch (error) {
    setStatus("error", "Clipboard blocked");
  }
}

function pushHistory(entry) {
  state.history = [entry, ...state.history].slice(0, MAX_HISTORY);
  persistHistory();
  renderHistory();
}

function renderHistory() {
  if (!state.history.length) {
    els.historyList.innerHTML = `<li class="history__item"><span>No recent conversions yet.</span><span class="history__meta">Try converting above.</span></li>`;
    return;
  }

  els.historyList.innerHTML = state.history
    .map((item) => {
      const stamp = new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return `
        <li class="history__item">
          <span>${formatMoney(item.amount)} ${item.from} → ${formatMoney(item.converted)} ${item.to}</span>
          <span class="history__meta">@ ${formatRate(item.rate)} · ${stamp}</span>
        </li>
      `;
    })
    .join("");
}

function clearHistory() {
  state.history = [];
  persistHistory();
  renderHistory();
  setStatus("idle", "History cleared");
}

function setLoading(isLoading) {
  state.isLoading = isLoading;
  els.convertBtn.disabled = isLoading;
  els.copyBtn.disabled = isLoading;

  if (isLoading) {
    setStatus("loading", "Loading...");
  }
}

function setStatus(type, text) {
  els.statusText.className = `status status--${type}`;
  els.statusText.textContent = text;
}

function showError(message) {
  els.errorBanner.hidden = false;
  els.errorBanner.textContent = message;
}

function hideError() {
  els.errorBanner.hidden = true;
  els.errorBanner.textContent = "";
}

function handleError(error, fallbackMessage) {
  console.error(error);
  setLoading(false);
  setStatus("error", "Action failed");
  showError(fallbackMessage);
}

function cacheRates(base, rates, updatedAt) {
  const cache = readJson(STORAGE_KEYS.ratesCache, {});
  cache[base] = {
    rates,
    updatedAt,
    fetchedAt: Date.now()
  };
  localStorage.setItem(STORAGE_KEYS.ratesCache, JSON.stringify(cache));
}

function getRatesCache(base) {
  const cache = readJson(STORAGE_KEYS.ratesCache, {});
  const entry = cache[base];

  if (!entry || !entry.fetchedAt) {
    return null;
  }

  const age = Date.now() - entry.fetchedAt;
  if (age > CACHE_MAX_AGE_MS) {
    return null;
  }

  return entry;
}

function hydrateSavedState() {
  const savedSettings = readJson(STORAGE_KEYS.settings, null);
  const savedHistory = readJson(STORAGE_KEYS.history, []);

  if (savedSettings) {
    state.from = savedSettings.from || state.from;
    state.to = savedSettings.to || state.to;
    state.amount = isValidAmount(Number(savedSettings.amount)) ? Number(savedSettings.amount) : state.amount;
  }

  state.history = Array.isArray(savedHistory) ? savedHistory.slice(0, MAX_HISTORY) : [];

  els.amountInput.value = state.amount;
  renderHistory();
}

function persistSettings() {
  const payload = {
    from: state.from,
    to: state.to,
    amount: state.amount
  };
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(payload));
}

function persistHistory() {
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
  const preferredDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = savedTheme || (preferredDark ? "dark" : "light");

  if (theme === "dark") {
    document.body.setAttribute("data-theme", "dark");
  } else {
    document.body.removeAttribute("data-theme");
  }
}

function toggleTheme() {
  const isDark = document.body.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.body.removeAttribute("data-theme");
    localStorage.setItem(STORAGE_KEYS.theme, "light");
  } else {
    document.body.setAttribute("data-theme", "dark");
    localStorage.setItem(STORAGE_KEYS.theme, "dark");
  }
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

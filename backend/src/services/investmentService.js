const finnhub = require("finnhub");
const { getFirestore } = require("../config/firebase");
const { Timestamp } = require("firebase-admin/firestore");

// ── Finnhub client ────────────────────────────────────────────────────────────
const finnhubClient = (() => {
  const apiClient = finnhub.ApiClient.instance;
  apiClient.authentications["api_key"].apiKey =
    process.env.FINNHUB_API_KEY || "";
  return new finnhub.DefaultApi();
})();

function fetchQuote(ticker) {
  return new Promise((resolve) => {
    finnhubClient.quote(ticker, (error, data) => {
      if (error || !data || data.c === 0) {
        console.warn(
          `Finnhub quote failed for ${ticker}:`,
          error?.message ?? "no data",
        );
        resolve(fetchYahooQuote(ticker));
      } else {
        resolve({
          c: data.c,
          pc: data.pc,
          dp: data.dp,
          source: "finnhub",
        });
      }
    });
  });
}

async function fetchYahooQuote(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`Yahoo quote failed for ${ticker}: HTTP ${response.status}`);
      return null;
    }

    const body = await response.json();
    const result = body?.chart?.result?.[0];
    const meta = result?.meta;
    const quote = result?.indicators?.quote?.[0];

    if (!meta) {
      console.warn(`Yahoo quote failed for ${ticker}: no data`);
      return null;
    }

    const currentPrice =
      firstNumber(meta.regularMarketPrice) ??
      lastNumber(quote?.close) ??
      firstNumber(meta.previousClose);
    const previousClose =
      firstNumber(meta.previousClose) ??
      firstNumber(meta.chartPreviousClose) ??
      lastNumber(quote?.close);

    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      console.warn(`Yahoo quote failed for ${ticker}: no price`);
      return null;
    }

    const normalizedCurrent = normalizeQuotePrice(currentPrice, meta.currency);
    const normalizedPrevious = normalizeQuotePrice(previousClose, meta.currency);
    const dayChangePct =
      Number.isFinite(normalizedPrevious) && normalizedPrevious > 0
        ? ((normalizedCurrent - normalizedPrevious) / normalizedPrevious) * 100
        : null;

    return {
      c: normalizedCurrent,
      pc: Number.isFinite(normalizedPrevious) ? normalizedPrevious : null,
      dp: dayChangePct,
      source: "yahoo",
    };
  } catch (err) {
    console.warn(`Yahoo quote failed for ${ticker}:`, err.message);
    return null;
  }
}

function firstNumber(value) {
  return Number.isFinite(value) ? value : null;
}

function lastNumber(values) {
  if (!Array.isArray(values)) return null;
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (Number.isFinite(values[i])) return values[i];
  }
  return null;
}

function normalizeQuotePrice(price, currency) {
  if (!Number.isFinite(price)) return null;
  // Yahoo quotes London stocks in pence as GBp, while the app stores LSE costs in GBP.
  if (currency === "GBp") return price / 100;
  return price;
}

/**
 * Fetch USD→SGD exchange rate via Finnhub forex quote.
 * Falls back to 1.35 if unavailable.
 */
async function fetchUsdToSgd() {
  const finnhubRate = await fetchFinnhubFxRate("OANDA:USD_SGD");
  if (finnhubRate) return finnhubRate;

  const yahooRate = await fetchYahooFxRate("USD", "SGD");
  if (yahooRate) return yahooRate;

  console.warn("FX rate fetch failed for USD/SGD, using fallback 1.35");
  return 1.35;
}

function fetchFinnhubFxRate(symbol) {
  return new Promise((resolve) => {
    finnhubClient.quote(symbol, (error, data) => {
      if (error || !data || data.c === 0) {
        resolve(null);
      } else {
        resolve(data.c);
      }
    });
  });
}

async function fetchFxRateToSgd(currency, fallback) {
  if (currency === "SGD") return 1;

  const finnhubRate = await fetchFinnhubFxRate(`OANDA:${currency}_SGD`);
  if (finnhubRate) return finnhubRate;

  const yahooRate = await fetchYahooFxRate(currency, "SGD");
  if (yahooRate) return yahooRate;

  console.warn(`FX rate fetch failed for ${currency}/SGD, using fallback ${fallback}`);
  return fallback;
}

async function fetchYahooFxRate(base, quote) {
  const symbol = `${base}${quote}=X`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) return null;

    const body = await response.json();
    const rate = firstNumber(body?.chart?.result?.[0]?.meta?.regularMarketPrice);
    return rate && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

function searchSymbols(query, limit = 5) {
  return new Promise((resolve) => {
    finnhubClient.symbolSearch(query, {}, (error, data) => {
      if (error || !data?.result) {
        resolve([]);
        return;
      }
      const results = data.result
        .filter((r) => r.type === "Common Stock" || r.type === "ETP")
        .slice(0, limit)
        .map((r) => ({
          symbol: r.symbol,
          shortName: r.description,
          exchange: r.displaySymbol,
          type: r.type,
        }));
      resolve(results);
    });
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Detect market from ticker symbol.
 * SGX tickers end with .SI
 * LSE tickers end with .L
 * Everything else defaults to US (NYSE/NASDAQ)
 */
function detectMarket(ticker) {
  if (ticker.endsWith(".SI")) return "SGX";
  if (ticker.endsWith(".L")) return "LSE";
  if (ticker.endsWith(".HK")) return "HKEX";
  if (ticker.endsWith(".AX")) return "ASX";
  return "US";
}

const MARKET_CURRENCY = {
  US: "USD",
  SGX: "SGD",
  LSE: "GBP",
  HKEX: "HKD",
  ASX: "AUD",
};

const MARKET_LABEL = {
  US: "US Markets (NYSE / NASDAQ)",
  SGX: "SGX (Singapore Exchange)",
  LSE: "LSE (London Stock Exchange)",
  HKEX: "HKEX (Hong Kong Exchange)",
  ASX: "ASX (Australian Securities Exchange)",
};

// ── Firestore ─────────────────────────────────────────────────────────────────
const COLLECTION = "investments";
function userInvestmentsRef(uid) {
  return getFirestore().collection("users").doc(uid).collection(COLLECTION);
}

async function listInvestments(uid) {
  const snap = await userInvestmentsRef(uid).orderBy("addedAt", "desc").get();
  return snap.docs.map(docToInvestment);
}

async function createInvestment(uid, data) {
  const ref = userInvestmentsRef(uid).doc();
  const ticker = data.ticker.toUpperCase();
  const payload = {
    ticker,
    name: data.name || ticker,
    shares: Number(data.shares),
    avgCost: Number(data.avgCost),
    market: detectMarket(ticker),
    addedAt: Timestamp.now(),
  };
  await ref.set(payload);
  return {
    id: ref.id,
    ...payload,
    addedAt: payload.addedAt.toDate().toISOString(),
  };
}

async function updateInvestment(uid, investmentId, data) {
  const ref = userInvestmentsRef(uid).doc(investmentId);
  const snap = await ref.get();
  if (!snap.exists)
    throw Object.assign(new Error("Investment not found"), { status: 404 });
  const updates = { updatedAt: Timestamp.now() };
  if (data.shares !== undefined) updates.shares = Number(data.shares);
  if (data.avgCost !== undefined) updates.avgCost = Number(data.avgCost);
  if (data.name !== undefined) updates.name = data.name;
  await ref.update(updates);
  return { id: investmentId, ...snap.data(), ...updates };
}

async function deleteInvestment(uid, investmentId) {
  const ref = userInvestmentsRef(uid).doc(investmentId);
  const snap = await ref.get();
  if (!snap.exists)
    throw Object.assign(new Error("Investment not found"), { status: 404 });
  await ref.delete();
}

/**
 * Fetch live quotes for all holdings.
 * Returns enriched holdings including:
 *   - market, currency (native)
 *   - currentPrice, marketValue, costBasis, unrealizedPnL in native currency
 *   - marketValueSGD, unrealizedPnLSGD (converted)
 *   - fxRateToSGD used for conversion
 */
async function getLiveQuotes(uid) {
  const investments = await listInvestments(uid);
  if (!investments.length) return [];

  // Fetch USD→SGD rate once (used for US stocks)
  const usdToSgd = await fetchUsdToSgd();

  // FX rates to SGD for each supported market
  // SGX is already SGD. Others need conversion.
  const [gbpToSgd, hkdToSgd, audToSgd] = await Promise.all([
    fetchFxRateToSgd("GBP", usdToSgd * 1.27),
    fetchFxRateToSgd("HKD", usdToSgd / 7.78),
    fetchFxRateToSgd("AUD", usdToSgd * 0.65),
  ]);

  const fxRates = {
    USD: usdToSgd,
    SGD: 1,
    GBP: gbpToSgd,
    HKD: hkdToSgd,
    AUD: audToSgd,
  };

  const tickers = [...new Set(investments.map((i) => i.ticker))];

  // Sequential with 120ms gap to respect Finnhub rate limits
  const quoteMap = {};
  for (const ticker of tickers) {
    quoteMap[ticker] = await fetchQuote(ticker);
    if (tickers.length > 1) await sleep(120);
  }

  return investments.map((inv) => {
    const q = quoteMap[inv.ticker];
    const market = inv.market || detectMarket(inv.ticker);
    const currency = MARKET_CURRENCY[market] || "USD";
    const fxRate = fxRates[currency] ?? fxRates.USD;

    const currentPrice = q?.c ?? null;
    const marketValue = currentPrice != null ? currentPrice * inv.shares : null;
    const costBasis = inv.avgCost * inv.shares;
    const unrealizedPnL = marketValue != null ? marketValue - costBasis : null;
    const unrealizedPnLPct =
      unrealizedPnL != null && costBasis > 0
        ? (unrealizedPnL / costBasis) * 100
        : null;

    // SGD-converted values for portfolio totals
    const marketValueSGD = marketValue != null ? marketValue * fxRate : null;
    const costBasisSGD = costBasis * fxRate;
    const unrealizedPnLSGD =
      unrealizedPnL != null ? unrealizedPnL * fxRate : null;

    // Today's $ change in native currency
    const prevValue =
      marketValue != null && q?.dp != null
        ? marketValue / (1 + q.dp / 100)
        : null;
    const dayChangeSGD =
      prevValue != null && marketValue != null
        ? (marketValue - prevValue) * fxRate
        : null;

    return {
      ...inv,
      market,
      currency,
      fxRateToSGD: fxRate,
      currentPrice,
      quoteSource: q?.source ?? null,
      marketValue,
      costBasis,
      unrealizedPnL,
      unrealizedPnLPct,
      dayChangePct: q?.dp ?? null,
      previousClose: q?.pc ?? null,
      // SGD-converted
      marketValueSGD,
      costBasisSGD,
      unrealizedPnLSGD,
      dayChangeSGD,
      shortName: inv.name,
    };
  });
}

async function searchTickers(query, limit = 5) {
  if (!query || query.trim().length < 1) return [];
  return searchSymbols(query.trim(), limit);
}

function docToInvestment(doc) {
  const d = doc.data();
  return {
    id: doc.id,
    ticker: d.ticker,
    name: d.name,
    shares: d.shares,
    avgCost: d.avgCost,
    market: d.market || detectMarket(d.ticker),
    addedAt: d.addedAt?.toDate?.()?.toISOString?.() ?? null,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = {
  listInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  getLiveQuotes,
  searchTickers,
  detectMarket,
  MARKET_CURRENCY,
  MARKET_LABEL,
};

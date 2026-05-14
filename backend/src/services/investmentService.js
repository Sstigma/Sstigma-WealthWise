const finnhub = require("finnhub");
const { getFirestore } = require("../config/firebase");
const { Timestamp } = require("firebase-admin/firestore");

// ── Finnhub client (singleton) ────────────────────────────────────────────────
const finnhubClient = (() => {
  const apiClient = finnhub.ApiClient.instance;
  apiClient.authentications["api_key"].apiKey =
    process.env.FINNHUB_API_KEY || "";
  return new finnhub.DefaultApi();
})();

/**
 * Promisified wrapper around finnhub's callback-based quote API.
 * Returns { c: currentPrice, dp: dayChangePct, pc: previousClose } or null on error.
 */
function fetchQuote(ticker) {
  return new Promise((resolve) => {
    finnhubClient.quote(ticker, (error, data) => {
      if (error || !data || data.c === 0) {
        console.warn(
          `Finnhub quote failed for ${ticker}:`,
          error?.message ?? "no data",
        );
        resolve(null);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * Finnhub symbol search — returns up to `limit` equity/ETF matches.
 */
function searchSymbols(query, limit = 5) {
  return new Promise((resolve) => {
    finnhubClient.symbolSearch(query, (error, data) => {
      if (error || !data?.result) {
        resolve([]);
        return;
      }
      const results = data.result
        .filter((r) => r.type === "Common Stock" || r.type === "ETP") // ETP = ETF
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

// ── Firestore helpers ─────────────────────────────────────────────────────────
const COLLECTION = "investments";

function userInvestmentsRef(uid) {
  return getFirestore().collection("users").doc(uid).collection(COLLECTION);
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
async function listInvestments(uid) {
  const snap = await userInvestmentsRef(uid).orderBy("addedAt", "desc").get();
  return snap.docs.map(docToInvestment);
}

async function createInvestment(uid, data) {
  const ref = userInvestmentsRef(uid).doc();
  const payload = {
    ticker: data.ticker.toUpperCase(),
    name: data.name || data.ticker.toUpperCase(),
    shares: Number(data.shares),
    avgCost: Number(data.avgCost),
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
 * Fetch live quotes for all holdings via Finnhub.
 */
async function getLiveQuotes(uid) {
  const investments = await listInvestments(uid);
  if (!investments.length) return [];

  const tickers = [...new Set(investments.map((i) => i.ticker))];

  // Sequential with small delay — avoids Finnhub's 30 req/s burst limit
  const quoteMap = {};
  for (const ticker of tickers) {
    quoteMap[ticker] = await fetchQuote(ticker);
    if (tickers.length > 1) await sleep(120); // 120ms gap between requests
  }

  return investments.map((inv) => {
    const q = quoteMap[inv.ticker];
    const currentPrice = q?.c ?? null;
    const marketValue = currentPrice != null ? currentPrice * inv.shares : null;
    const costBasis = inv.avgCost * inv.shares;
    const unrealizedPnL = marketValue != null ? marketValue - costBasis : null;
    const unrealizedPnLPct =
      unrealizedPnL != null && costBasis > 0
        ? (unrealizedPnL / costBasis) * 100
        : null;

    return {
      ...inv,
      currentPrice,
      marketValue,
      costBasis,
      unrealizedPnL,
      unrealizedPnLPct,
      dayChangePct: q?.dp ?? null, 
      previousClose: q?.pc ?? null,
      currency: "SGD", 
      shortName: inv.name,
    };
  });
}

async function searchTickers(query, limit = 5) {
  if (!query || query.trim().length < 1) return [];
  return searchSymbols(query.trim(), limit);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function docToInvestment(doc) {
  const d = doc.data();
  return {
    id: doc.id,
    ticker: d.ticker,
    name: d.name,
    shares: d.shares,
    avgCost: d.avgCost,
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
};

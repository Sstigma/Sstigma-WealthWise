// backend/src/services/investmentService.js

const YahooFinance = require("yahoo-finance2").default;
const { getFirestore } = require("../config/firebase");
const { Timestamp } = require("firebase-admin/firestore");

// v3: instantiate once as a module-level singleton
const yf = new YahooFinance();

const COLLECTION = "investments";

function userInvestmentsRef(uid) {
  return getFirestore().collection("users").doc(uid).collection(COLLECTION);
}

/** List all investments for a user. */
async function listInvestments(uid) {
  const snap = await userInvestmentsRef(uid).orderBy("addedAt", "desc").get();
  return snap.docs.map(docToInvestment);
}

/** Add an investment holding. */
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

/** Update shares or avgCost for an investment. */
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

/** Remove an investment. */
async function deleteInvestment(uid, investmentId) {
  const ref = userInvestmentsRef(uid).doc(investmentId);
  const snap = await ref.get();
  if (!snap.exists)
    throw Object.assign(new Error("Investment not found"), { status: 404 });
  await ref.delete();
}

/**
 * Fetch live quotes for all of a user's tickers via Yahoo Finance v3.
 * Returns enriched holdings with current price, day change, market value, and P&L.
 */
async function getLiveQuotes(uid) {
  const investments = await listInvestments(uid);
  if (!investments.length) return [];

  const tickers = [...new Set(investments.map((i) => i.ticker))];

  // v3: use the yf instance, same .quote() method signature as v2
  const quoteResults = await Promise.allSettled(
    tickers.map((ticker) => yf.quote(ticker)),
  );

  const quoteMap = {};
  tickers.forEach((ticker, idx) => {
    const result = quoteResults[idx];
    if (result.status === "fulfilled" && result.value) {
      quoteMap[ticker] = result.value;
    } else {
      console.warn(
        `Failed to fetch quote for ${ticker}:`,
        result.reason?.message,
      );
    }
  });

  return investments.map((inv) => {
    const quote = quoteMap[inv.ticker];
    const currentPrice = quote?.regularMarketPrice ?? null;
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
      dayChangePct: quote?.regularMarketChangePercent ?? null,
      currency: quote?.currency ?? "USD",
      shortName: quote?.shortName ?? inv.name,
    };
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function docToInvestment(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ticker: data.ticker,
    name: data.name,
    shares: data.shares,
    avgCost: data.avgCost,
    addedAt: data.addedAt?.toDate?.()?.toISOString?.() ?? null,
  };
}

module.exports = {
  listInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  getLiveQuotes,
};

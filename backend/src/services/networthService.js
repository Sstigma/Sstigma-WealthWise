const { getFirestore } = require('../config/firebase');
const { Timestamp } = require('firebase-admin/firestore');
const { getMonthlySummary } = require('./expenseService');
const { getLiveQuotes } = require('./investmentService');

function userNetworthRef(uid) {
  return getFirestore().collection('users').doc(uid).collection('netWorthSnapshots');
}

/**
 * Compute the current net worth breakdown:
 *  - cash = total income minus total expenses (current month YTD approximation)
 *  - investments = live market value of portfolio
 *  - totalNetWorth = cash + investments
 */
async function getCurrentNetWorth(uid) {
  const [quotes, monthlySummaries] = await Promise.all([
    getLiveQuotes(uid),
    getMonthlySummary(uid),
  ]);

  const investmentsValue = quotes.reduce((sum, q) => sum + (q.marketValue ?? q.costBasis), 0);
  const totalExpenses = monthlySummaries.reduce((sum, m) => sum + m.total, 0);

  // Cash proxy: negative of all tracked expenses (net outflows)
  const cash = -totalExpenses;

  const totalNetWorth = cash + investmentsValue;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonth = monthlySummaries.find((m) => m.month === currentMonth);

  return {
    cash,
    investmentsValue,
    totalNetWorth,
    totalExpenses,
    currentMonthExpenses: thisMonth?.total ?? 0,
    currentMonthByCategory: thisMonth?.byCategory ?? {},
    portfolioHoldings: quotes,
  };
}

/**
 * Save a monthly net worth snapshot (call at end of month or on-demand).
 */
async function saveSnapshot(uid, { cash, investmentsValue, month }) {
  const ref = userNetworthRef(uid).doc(month);
  const payload = {
    month,
    cash: Number(cash),
    investmentsValue: Number(investmentsValue),
    totalNetWorth: Number(cash) + Number(investmentsValue),
    createdAt: Timestamp.now(),
  };
  await ref.set(payload, { merge: true });
  return payload;
}

/**
 * Return historical snapshots sorted ascending.
 */
async function getHistory(uid) {
  const snap = await userNetworthRef(uid).orderBy('month', 'asc').get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      month: data.month,
      cash: data.cash,
      investmentsValue: data.investmentsValue,
      totalNetWorth: data.totalNetWorth,
    };
  });
}

module.exports = { getCurrentNetWorth, saveSnapshot, getHistory };

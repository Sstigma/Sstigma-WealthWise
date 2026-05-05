const { getFirestore } = require('../config/firebase');
const { Timestamp } = require('firebase-admin/firestore');

const COLLECTION = 'expenses';

function userExpensesRef(uid) {
  return getFirestore().collection('users').doc(uid).collection(COLLECTION);
}

/**
 * List expenses for a user.
 * Optionally filter by month string (YYYY-MM).
 */
async function listExpenses(uid, { month } = {}) {
  let query = userExpensesRef(uid).orderBy('date', 'desc');

  if (month) {
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);
    query = query
      .where('date', '>=', Timestamp.fromDate(start))
      .where('date', '<', Timestamp.fromDate(end));
  }

  const snap = await query.get();
  return snap.docs.map(docToExpense);
}

/**
 * Create a new expense document.
 */
async function createExpense(uid, data) {
  const ref = userExpensesRef(uid).doc();
  const payload = {
    detail: data.detail,
    category: data.category,
    amount: Number(data.amount),
    date: Timestamp.fromDate(new Date(data.date)),
    createdAt: Timestamp.now(),
  };
  await ref.set(payload);
  return { id: ref.id, ...docPayloadToExpense(payload) };
}

/**
 * Update an existing expense.
 */
async function updateExpense(uid, expenseId, data) {
  const ref = userExpensesRef(uid).doc(expenseId);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('Expense not found'), { status: 404 });

  const updates = {};
  if (data.detail !== undefined) updates.detail = data.detail;
  if (data.category !== undefined) updates.category = data.category;
  if (data.amount !== undefined) updates.amount = Number(data.amount);
  if (data.date !== undefined) updates.date = Timestamp.fromDate(new Date(data.date));
  updates.updatedAt = Timestamp.now();

  await ref.update(updates);
  return { id: expenseId, ...docPayloadToExpense({ ...snap.data(), ...updates }) };
}

/**
 * Delete an expense.
 */
async function deleteExpense(uid, expenseId) {
  const ref = userExpensesRef(uid).doc(expenseId);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('Expense not found'), { status: 404 });
  await ref.delete();
}

/**
 * Return a monthly summary: total per month and breakdown by category.
 * Returns last 12 months by default.
 */
async function getMonthlySummary(uid) {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const snap = await userExpensesRef(uid)
    .where('date', '>=', Timestamp.fromDate(twelveMonthsAgo))
    .orderBy('date', 'asc')
    .get();

  const byMonth = {};

  snap.docs.forEach((doc) => {
    const { date, amount, category } = doc.data();
    const d = date.toDate();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    if (!byMonth[key]) byMonth[key] = { month: key, total: 0, byCategory: {} };
    byMonth[key].total += amount;
    byMonth[key].byCategory[category] =
      (byMonth[key].byCategory[category] || 0) + amount;
  });

  return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function docToExpense(doc) {
  return { id: doc.id, ...docPayloadToExpense(doc.data()) };
}

function docPayloadToExpense(data) {
  return {
    detail: data.detail,
    category: data.category,
    amount: data.amount,
    date: data.date?.toDate?.()?.toISOString?.() ?? data.date,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
  };
}

module.exports = {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getMonthlySummary,
};

const { getFirestore } = require('../config/firebase');
const { Timestamp } = require('firebase-admin/firestore');

function userTxRef(uid)      { return getFirestore().collection('users').doc(uid).collection('transactions'); }
function userAccountsRef(uid){ return getFirestore().collection('users').doc(uid).collection('accounts'); }

// ── Accounts ─────────────────────────────────────────────────────────────────

async function listAccounts(uid) {
  const snap = await userAccountsRef(uid).orderBy('createdAt', 'asc').get();
  return snap.docs.map(docToAccount);
}

async function createAccount(uid, data) {
  const ref  = userAccountsRef(uid).doc();
  const payload = { name: data.name, type: data.type || 'bank', currency: 'SGD', createdAt: Timestamp.now() };
  await ref.set(payload);
  return { id: ref.id, ...toPlain(payload) };
}

async function updateAccount(uid, accountId, data) {
  const ref  = userAccountsRef(uid).doc(accountId);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('Account not found'), { status: 404 });
  const updates = { updatedAt: Timestamp.now() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.type !== undefined) updates.type = data.type;
  await ref.update(updates);
  return { id: accountId, ...snap.data(), ...updates };
}

async function deleteAccount(uid, accountId) {
  const ref  = userAccountsRef(uid).doc(accountId);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('Account not found'), { status: 404 });
  await ref.delete();
}

// ── Transactions ──────────────────────────────────────────────────────────────

async function listTransactions(uid, { month, accountId, type } = {}) {
  let q = userTxRef(uid).orderBy('date', 'desc');
  if (month) {
    const [yr, mo] = month.split('-').map(Number);
    q = q.where('date', '>=', Timestamp.fromDate(new Date(yr, mo-1, 1)))
         .where('date', '<',  Timestamp.fromDate(new Date(yr, mo,   1)));
  }
  if (accountId) q = q.where('accountId', '==', accountId);
  if (type)      q = q.where('type',      '==', type);
  const snap = await q.get();
  return snap.docs.map(docToTx);
}

async function createTransaction(uid, data) {
  const ref = userTxRef(uid).doc();
  const payload = buildPayload(data);
  await ref.set(payload);
  return { id: ref.id, ...toPlain(payload) };
}

async function updateTransaction(uid, txId, data) {
  const ref  = userTxRef(uid).doc(txId);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('Transaction not found'), { status: 404 });
  const updates = { ...buildPayload({ ...snap.data(), ...data }), updatedAt: Timestamp.now() };
  await ref.update(updates);
  return { id: txId, ...toPlain({ ...snap.data(), ...updates }) };
}

async function deleteTransaction(uid, txId) {
  const ref  = userTxRef(uid).doc(txId);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('Transaction not found'), { status: 404 });
  await ref.delete();
}

async function getMonthlySummary(uid) {
  const twelveAgo = new Date();
  twelveAgo.setMonth(twelveAgo.getMonth() - 11);
  twelveAgo.setDate(1); twelveAgo.setHours(0,0,0,0);

  const [txSnap, accounts] = await Promise.all([
    userTxRef(uid).where('date','>=', Timestamp.fromDate(twelveAgo)).orderBy('date','asc').get(),
    listAccounts(uid),
  ]);

  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a.name]));
  const byMonth = {};

  txSnap.docs.forEach(doc => {
    const { date, amount, type, accountId, category } = doc.data();
    const d   = date.toDate();
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (!byMonth[key]) byMonth[key] = { month:key, totalIncome:0, totalExpenses:0, netPL:0, byAccount:{}, byCategory:{} };
    const m = byMonth[key];

    if (type === 'income')  m.totalIncome   += amount;
    if (type === 'expense') m.totalExpenses += amount;
    m.netPL = m.totalIncome - m.totalExpenses;

    const aName = accountMap[accountId] || 'Unassigned';
    if (!m.byAccount[aName]) m.byAccount[aName] = { income:0, expenses:0, netPL:0 };
    if (type === 'income')  m.byAccount[aName].income   += amount;
    if (type === 'expense') m.byAccount[aName].expenses += amount;
    m.byAccount[aName].netPL = m.byAccount[aName].income - m.byAccount[aName].expenses;

    if (category && type === 'expense') m.byCategory[category] = (m.byCategory[category]||0) + amount;
  });

  return Object.values(byMonth).sort((a,b) => a.month.localeCompare(b.month));
}

async function getTotalCashBalance(uid) {
  const snap = await userTxRef(uid).get();
  let total = 0;
  snap.docs.forEach(doc => {
    const { type, amount } = doc.data();
    if (type === 'income')  total += amount;
    if (type === 'expense') total -= amount;
  });
  return total;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildPayload(data) {
  return {
    detail:    data.detail,
    category:  data.category || '',
    type:      data.type || 'expense',
    amount:    Number(data.amount),
    date:      data.date instanceof Timestamp ? data.date : Timestamp.fromDate(new Date(data.date)),
    accountId: data.accountId || null,
    createdAt: data.createdAt || Timestamp.now(),
  };
}
function docToTx(doc)      { return { id: doc.id, ...toPlain(doc.data()) }; }
function docToAccount(doc) { return { id: doc.id, ...toPlain(doc.data()) }; }
function toPlain(data) {
  const o = {...data};
  if (o.date?.toDate)      o.date      = o.date.toDate().toISOString();
  if (o.createdAt?.toDate) o.createdAt = o.createdAt.toDate().toISOString();
  if (o.updatedAt?.toDate) o.updatedAt = o.updatedAt.toDate().toISOString();
  return o;
}

module.exports = {
  listAccounts, createAccount, updateAccount, deleteAccount,
  listTransactions, createTransaction, updateTransaction, deleteTransaction,
  getMonthlySummary, getTotalCashBalance,
};

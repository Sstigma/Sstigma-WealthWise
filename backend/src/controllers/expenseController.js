const { validationResult } = require('express-validator');
const svc = require('../services/expenseService');
const { asyncHandler } = require('../middleware/errorHandler');

// ── Accounts ──────────────────────────────────────────────────────────────────
const listAccounts   = asyncHandler(async (req, res) => res.json({ data: await svc.listAccounts(req.user.uid) }));
const createAccount  = asyncHandler(async (req, res) => { const errs = validationResult(req); if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() }); res.status(201).json({ data: await svc.createAccount(req.user.uid, req.body) }); });
const updateAccount  = asyncHandler(async (req, res) => res.json({ data: await svc.updateAccount(req.user.uid, req.params.id, req.body) }));
const deleteAccount  = asyncHandler(async (req, res) => { await svc.deleteAccount(req.user.uid, req.params.id); res.status(204).end(); });

// ── Transactions ──────────────────────────────────────────────────────────────
const listTransactions  = asyncHandler(async (req, res) => {
  const { month, accountId, type } = req.query;
  res.json({ data: await svc.listTransactions(req.user.uid, { month, accountId, type }) });
});
const createTransaction = asyncHandler(async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
  res.status(201).json({ data: await svc.createTransaction(req.user.uid, req.body) });
});
const updateTransaction = asyncHandler(async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
  res.json({ data: await svc.updateTransaction(req.user.uid, req.params.id, req.body) });
});
const deleteTransaction = asyncHandler(async (req, res) => { await svc.deleteTransaction(req.user.uid, req.params.id); res.status(204).end(); });
const getMonthlySummary = asyncHandler(async (req, res) => res.json({ data: await svc.getMonthlySummary(req.user.uid) }));

module.exports = { listAccounts, createAccount, updateAccount, deleteAccount, listTransactions, createTransaction, updateTransaction, deleteTransaction, getMonthlySummary };

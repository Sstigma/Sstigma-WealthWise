const { validationResult } = require('express-validator');
const expenseService = require('../services/expenseService');
const { asyncHandler } = require('../middleware/errorHandler');

const listExpenses = asyncHandler(async (req, res) => {
  const { month } = req.query;
  const expenses = await expenseService.listExpenses(req.user.uid, { month });
  res.json({ data: expenses });
});

const createExpense = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const expense = await expenseService.createExpense(req.user.uid, req.body);
  res.status(201).json({ data: expense });
});

const updateExpense = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const expense = await expenseService.updateExpense(
    req.user.uid,
    req.params.id,
    req.body
  );
  res.json({ data: expense });
});

const deleteExpense = asyncHandler(async (req, res) => {
  await expenseService.deleteExpense(req.user.uid, req.params.id);
  res.status(204).end();
});

const getMonthlySummary = asyncHandler(async (req, res) => {
  const summary = await expenseService.getMonthlySummary(req.user.uid);
  res.json({ data: summary });
});

module.exports = { listExpenses, createExpense, updateExpense, deleteExpense, getMonthlySummary };

const { validationResult } = require('express-validator');
const investmentService = require('../services/investmentService');
const { asyncHandler } = require('../middleware/errorHandler');

const listInvestments = asyncHandler(async (req, res) => {
  const investments = await investmentService.listInvestments(req.user.uid);
  res.json({ data: investments });
});

const createInvestment = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const investment = await investmentService.createInvestment(req.user.uid, req.body);
  res.status(201).json({ data: investment });
});

const updateInvestment = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const investment = await investmentService.updateInvestment(
    req.user.uid,
    req.params.id,
    req.body
  );
  res.json({ data: investment });
});

const deleteInvestment = asyncHandler(async (req, res) => {
  await investmentService.deleteInvestment(req.user.uid, req.params.id);
  res.status(204).end();
});

const getLiveQuotes = asyncHandler(async (req, res) => {
  const quotes = await investmentService.getLiveQuotes(req.user.uid);
  res.json({ data: quotes });
});

module.exports = {
  listInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  getLiveQuotes,
};

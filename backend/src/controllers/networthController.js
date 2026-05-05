const networthService = require('../services/networthService');
const { asyncHandler } = require('../middleware/errorHandler');

const getCurrentNetWorth = asyncHandler(async (req, res) => {
  const data = await networthService.getCurrentNetWorth(req.user.uid);
  res.json({ data });
});

const getHistory = asyncHandler(async (req, res) => {
  const data = await networthService.getHistory(req.user.uid);
  res.json({ data });
});

const saveSnapshot = asyncHandler(async (req, res) => {
  const { cash, investmentsValue, month } = req.body;
  if (!month) return res.status(400).json({ error: 'month is required (YYYY-MM)' });
  const data = await networthService.saveSnapshot(req.user.uid, {
    cash,
    investmentsValue,
    month,
  });
  res.status(201).json({ data });
});

module.exports = { getCurrentNetWorth, getHistory, saveSnapshot };

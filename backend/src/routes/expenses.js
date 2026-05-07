const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/expenseController');
const { authenticate } = require('../middleware/auth');

const router = Router();
router.use(authenticate);

const txValidation = [
  body('date').isISO8601().withMessage('date must be ISO 8601'),
  body('detail').trim().notEmpty().withMessage('detail is required'),
  body('type').isIn(['income','expense']).withMessage('type must be income or expense'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be positive'),
];

const accountValidation = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('type').optional().isIn(['bank','cash','credit','savings']),
];

// Accounts
router.get('/accounts',          ctrl.listAccounts);
router.post('/accounts',         accountValidation, ctrl.createAccount);
router.put('/accounts/:id',      ctrl.updateAccount);
router.delete('/accounts/:id',   ctrl.deleteAccount);

// Transactions
router.get('/',          ctrl.listTransactions);
router.get('/summary',   ctrl.getMonthlySummary);
router.post('/',         txValidation, ctrl.createTransaction);
router.put('/:id',       txValidation, ctrl.updateTransaction);
router.delete('/:id',    ctrl.deleteTransaction);

module.exports = router;

const { Router } = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/expenseController');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.use(authenticate);

const expenseValidation = [
  body('date').isISO8601().withMessage('date must be ISO 8601'),
  body('detail').trim().notEmpty().withMessage('detail is required'),
  body('category').trim().notEmpty().withMessage('category is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
];

router.get('/', controller.listExpenses);
router.get('/summary', controller.getMonthlySummary);
router.post('/', expenseValidation, controller.createExpense);
router.put('/:id', expenseValidation, controller.updateExpense);
router.delete('/:id', controller.deleteExpense);

module.exports = router;

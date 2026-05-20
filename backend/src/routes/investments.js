const { Router } = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/investmentController');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.use(authenticate);

const investmentValidation = [
  body('ticker').trim().notEmpty().withMessage('ticker is required'),
  body('shares').isFloat({ gt: 0 }).withMessage('shares must be a positive number'),
  body('avgCost').isFloat({ gt: 0 }).withMessage('avgCost must be a positive number'),
];

router.get('/', controller.listInvestments);
router.get('/quotes', controller.getLiveQuotes);
router.get('/search', controller.searchTickers);
router.post('/', investmentValidation, controller.createInvestment);
router.put('/:id', controller.updateInvestment);
router.delete('/:id', controller.deleteInvestment);

module.exports = router;

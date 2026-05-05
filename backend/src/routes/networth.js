const { Router } = require('express');
const controller = require('../controllers/networthController');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.use(authenticate);

router.get('/', controller.getCurrentNetWorth);
router.get('/history', controller.getHistory);
router.post('/snapshot', controller.saveSnapshot);

module.exports = router;

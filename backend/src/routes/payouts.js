const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payoutController');
const auth = require('../middleware/auth');

router.post('/telebirr', auth, payoutController.disburseTelebirr);
router.post('/cbe-birr', auth, payoutController.disburseCbeBirr);

module.exports = router;

const express = require('express');
const router = express.Router();
const insuranceController = require('../controllers/insuranceController');
const auth = require('../middleware/auth');
const { authorize, Roles } = require('../middleware/rbac');

router.get('/plans', auth, insuranceController.getPlans);
router.post('/subscribe', auth, authorize([Roles.EMPLOYER, Roles.ADMIN]), insuranceController.subscribePlan);

module.exports = router;

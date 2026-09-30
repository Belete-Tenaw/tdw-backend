const express = require('express');
const router = express.Router();
const safetyController = require('../controllers/safetyController');
const verifyToken = require('../middleware/auth');

// All safety routes require authentication
router.use(verifyToken);

router.post('/sos', safetyController.triggerSOS);
router.patch('/sos/:id/resolve', safetyController.resolveSOS);
router.post('/transit-update', safetyController.updateTransitLocation);
router.get('/transit-location/:contractId', safetyController.getTransitLocation);
router.post('/scan-content', safetyController.scanContentForPoaching);
router.get('/fraud-audit/:userId', safetyController.auditUserFraud);

module.exports = router;

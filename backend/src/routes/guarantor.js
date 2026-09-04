const express = require('express');
const router = express.Router();
const guarantorController = require('../controllers/guarantorController');
const auth = require('../middleware/auth');
const { authorize, Roles } = require('../middleware/rbac');

// Seeker voluntary invite & status
router.post('/invite', auth, authorize([Roles.SEEKER]), guarantorController.requestVerification);
router.get('/status', auth, authorize([Roles.SEEKER]), guarantorController.getStatus);

// Public guarantor consent verification link & confirmation
router.get('/public-verify/:token', guarantorController.getPublicConsentDetails);
router.post('/public-confirm', guarantorController.verifyConsent);

module.exports = router;

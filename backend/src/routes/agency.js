const express = require('express');
const router = express.Router();
const agencyController = require('../controllers/agencyController');
const auth = require('../middleware/auth');
const { authorize, Roles } = require('../middleware/rbac');


/**
 * Enterprise B2B Agency Routes
 * Accessible by AGENCY and ADMIN roles.
 */
router.get('/dashboard', auth, authorize([Roles.AGENCY, Roles.ADMIN]), agencyController.getAgencyDashboardStats);
router.post('/workers', auth, authorize([Roles.AGENCY, Roles.ADMIN]), agencyController.registerAgencyWorker);

module.exports = router;

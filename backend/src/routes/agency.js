const express = require('express');
const router = express.Router();
const agencyController = require('../controllers/agencyController');
const auth = require('../middleware/auth');
const { authorize, Roles } = require('../middleware/rbac');

/**
 * Public Agency Routes
 */
router.post('/register', agencyController.registerAgency);
router.post('/login', agencyController.loginAgency);
router.get('/public/:agencyId', agencyController.getPublicAgencyProfile);

/**
 * Protected B2B Agency Operations
 * Accessible by AGENCY and ADMIN roles.
 */
router.get('/dashboard', auth, authorize([Roles.AGENCY, Roles.ADMIN]), agencyController.getAgencyDashboardStats);
router.get('/workers', auth, authorize([Roles.AGENCY, Roles.ADMIN]), agencyController.getAgencyWorkers);
router.post('/workers', auth, authorize([Roles.AGENCY, Roles.ADMIN]), agencyController.registerAgencyWorker);
router.post('/workers/bulk', auth, authorize([Roles.AGENCY, Roles.ADMIN]), agencyController.bulkRegisterWorkers);
router.put('/workers/:workerId/status', auth, authorize([Roles.AGENCY, Roles.ADMIN]), agencyController.updateWorkerPlacementStatus);

module.exports = router;

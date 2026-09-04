const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const auth = require('../middleware/auth');
const checkLimits = require('../middleware/checkLimits');
const { authorize, Roles } = require('../middleware/rbac');

router.get('/', auth, jobController.getAllJobs);
router.get('/:id', auth, checkLimits, jobController.getJobById);
router.post('/', auth, authorize([Roles.EMPLOYER]), jobController.createJobPost);
router.get('/:id/matches', auth, authorize([Roles.EMPLOYER]), jobController.getMatchesForJob);
router.get('/:id/smart-candidates', auth, authorize([Roles.EMPLOYER]), jobController.getSmartCandidatesForJob);

module.exports = router;

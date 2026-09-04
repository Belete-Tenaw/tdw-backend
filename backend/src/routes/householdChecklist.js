const express = require('express');
const router = express.Router();
const controller = require('../controllers/householdChecklistController');
const auth = require('../middleware/auth');

router.get('/:contractId', auth, controller.getChecklist);
router.post('/:contractId', auth, controller.updateChecklist);
router.put('/:contractId/sign', auth, controller.signChecklist);
router.put('/:contractId/clearance', auth, controller.signClearance);

module.exports = router;

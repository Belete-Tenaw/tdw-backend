const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const auth = require('../middleware/auth');

router.post('/', auth, contractController.createContract);
router.get('/', auth, contractController.getContracts);
router.get('/:contractId', auth, contractController.getContractById);
router.put('/:contractId/sign', auth, contractController.signContract);
router.post('/:contractId/e-sign', auth, contractController.eSignContract);
router.post('/:contractId/renew', auth, contractController.renewContract);

// ━━━ Smart Milestone Escrow Routes ━━━
router.put('/:contractId/milestone', auth, contractController.advanceMilestone);
router.get('/:contractId/text', auth, contractController.getContractText);

module.exports = router;


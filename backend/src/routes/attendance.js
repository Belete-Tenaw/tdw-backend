const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const auth = require('../middleware/auth');
const { authorize, Roles } = require('../middleware/rbac');

router.post('/check-in', auth, authorize([Roles.SEEKER]), attendanceController.clockIn);
router.post('/check-out', auth, authorize([Roles.SEEKER]), attendanceController.clockOut);
router.get('/my-shifts', auth, authorize([Roles.SEEKER]), attendanceController.getMyShifts);
router.get('/status/:contractId', auth, attendanceController.getActiveShift);
router.get('/contract/:contractId', auth, attendanceController.getContractShifts);

module.exports = router;

const express = require('express');
const router = express.Router();
const voiceCopilotController = require('../controllers/voiceCopilotController');
const auth = require('../middleware/auth');
const { authorize, Roles } = require('../middleware/rbac');

router.get('/questions', auth, voiceCopilotController.getQuestions);
router.post('/submit', auth, authorize([Roles.SEEKER]), voiceCopilotController.submitInterview);

module.exports = router;

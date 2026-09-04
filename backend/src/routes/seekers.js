const express = require('express');
const router = express.Router();
const seekerController = require('../controllers/seekerController');
const auth = require('../middleware/auth');
const checkLimits = require('../middleware/checkLimits');
const { authorize, Roles } = require('../middleware/rbac');
const checkPremiumAccess = require('../middleware/checkPremiumAccess');
const upload = require('../middleware/upload');
const { authRateLimiter } = require('../middleware/rateLimiter');

router.get('/', auth, authorize([Roles.EMPLOYER, Roles.ADMIN]), checkPremiumAccess, async (req, res, next) => {
    // Log browsing action for audit trail
    const { logAction } = require('../services/auditService');
    await logAction('BROWSE_SEEKER_LIST', req.user.id, req.user.role);
    next();
}, seekerController.getAllSeekers);

router.get('/:id', auth, (req, res, next) => {
    // Only EMPLOYER can view others' profiles, or a SEEKER can view their own
    if (req.user.role === 'JOB_SEEKER' && req.params.id !== req.user.id) {
        return res.status(403).json({ error: 'Permission denied', message: 'Seekers can only view their own profile.' });
    }
    next();
}, checkLimits, checkPremiumAccess, seekerController.getSeekerProfile);

router.put('/profile', auth, authorize([Roles.SEEKER]), upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'idDocument', maxCount: 1 },
    { name: 'nationalIdUrl', maxCount: 1 },
    { name: 'guarantorIdUrl', maxCount: 1 },
    { name: 'policeClearanceUrl', maxCount: 1 },
    { name: 'healthCertificateUrl', maxCount: 1 },
    { name: 'videoBio', maxCount: 1 }
]), seekerController.updateProfile);

router.post('/fayda/request-otp', auth, authorize([Roles.SEEKER]), authRateLimiter, seekerController.requestFaydaOTP);
router.post('/fayda/verify', auth, authorize([Roles.SEEKER]), authRateLimiter, seekerController.verifyFayda);
router.get('/concierge/picks', auth, authorize([Roles.EMPLOYER]), seekerController.getConciergePicks);

// Smart AI Matching & Voice Assistant & Certification
router.get('/smart-jobs', auth, authorize([Roles.SEEKER]), seekerController.getSmartJobsForSeeker);
router.post('/voice-bio', auth, authorize([Roles.SEEKER]), seekerController.processVoiceBio);
router.get('/quizzes', auth, authorize([Roles.SEEKER]), seekerController.getQuizzes);
router.post('/verify-quiz', auth, authorize([Roles.SEEKER]), seekerController.verifyQuiz);

module.exports = router;


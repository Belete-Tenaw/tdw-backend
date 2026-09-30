const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../middleware/upload');
const { authRateLimiter, registerRateLimiter } = require('../middleware/rateLimiter');
const verifyToken = require('../middleware/auth');

// Job Seeker Routes
router.post('/seeker/register', registerRateLimiter, upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'idDocument', maxCount: 1 },
    { name: 'nationalIdUrl', maxCount: 1 },
    { name: 'guarantorIdUrl', maxCount: 1 },
    { name: 'policeClearanceUrl', maxCount: 1 },
    { name: 'healthCertificateUrl', maxCount: 1 },
    { name: 'videoBio', maxCount: 1 }
]), upload.enforceImageSizeLimit, authController.registerJobSeeker);

router.post('/seeker/login', authRateLimiter, authController.loginJobSeeker);

// Employer Routes
router.post('/employer/register', registerRateLimiter, upload.none(), authController.registerEmployer);
router.post('/employer/login', authRateLimiter, authController.loginEmployer);

// Admin Routes
router.post('/admin/login', authRateLimiter, authController.loginAdmin);

// Firebase integration
router.post('/firebase-login', authController.firebaseLogin);

// Password reset
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);
router.post('/reset-password', authRateLimiter, authController.resetPassword);

// Pre-flight duplicate check (phone or email, no auth required)
router.get('/check-duplicate', authController.checkDuplicate);

// Notification Routes (Authenticated)
router.get('/notifications', verifyToken, authController.getNotifications);
router.put('/notifications/:id/read', verifyToken, authController.markNotificationRead);
router.put('/notifications/read-all', verifyToken, authController.markAllNotificationsRead);

// FCM Push Notification Token Registration
// Called by frontend on every login to keep device token fresh
router.patch('/fcm-token', verifyToken, authController.updateFcmToken);

module.exports = router;
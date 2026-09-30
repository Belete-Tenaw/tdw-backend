const prismaInstance = require('../utils/prisma');
const notificationService = require('../services/notificationService');
const fcmService = require('../services/fcmService');
const fraudDetectionService = require('../services/fraudDetectionService');

/**
 * Trigger an SOS Alert
 * Fan-out: In-App + FCM (admin topic + worker device) + Telegram + SMS
 */
exports.triggerSOS = async (req, res) => {
    try {
        const io = req.app.get('io');
        const { userId, userType, latitude, longitude } = req.body;

        if (!userId || !userType) {
            return res.status(400).json({ error: 'User ID and User Type are required.' });
        }

        // 1. Create SOS Alert in DB
        const sosAlert = await prismaInstance.sOSAlert.create({
            data: { userId, userType, latitude, longitude, status: 'ACTIVE' }
        });

        // 2. Fetch user details
        let userData = null;
        if (userType === 'JOB_SEEKER') {
            userData = await prismaInstance.jobSeeker.findUnique({ where: { id: userId } });
        } else {
            userData = await prismaInstance.employer.findUnique({ where: { id: userId } });
        }

        const userName  = userData ? (userData.fullName || userData.contactName || 'User') : 'Unknown';
        const userPhone = userData ? (userData.phone || null) : null;
        const fcmToken  = userData ? (userData.fcmToken || null) : null;
        const loc       = (latitude && longitude) ? (latitude + ', ' + longitude) : 'Unknown';
        const timeStr   = new Date().toLocaleString();
        const sosTitle  = 'SOS EMERGENCY ALERT';
        const adminMsg  = 'User: ' + userName + ' | Loc: ' + loc + ' | ' + timeStr;

        // 3. Fan-out across all notification channels simultaneously
        await Promise.allSettled([
            // a. In-app confirmation to the worker
            notificationService.createInAppNotification(
                userId, userType, 'SOS Alert Sent',
                'Your emergency alert has been sent. Help is on the way.',
                'SOS', io
            ),
            // b. FCM broadcast to all admin devices via topic subscription
            fcmService.sendToTopic('sos_admins', sosTitle, adminMsg, {
                type: 'SOS', sosId: sosAlert.id, userId,
                lat: String(latitude || ''), lng: String(longitude || '')
            }),
            // c. FCM push confirmation to worker own device
            fcmToken
                ? fcmService.sendToDevice(fcmToken, 'SOS Sent', 'Help is on the way. Stay safe.', { type: 'SOS' })
                : Promise.resolve(null),
            // d. Telegram alert to admin group chat
            process.env.TELEGRAM_ADMIN_CHAT_ID
                ? notificationService.sendTelegramAlert(
                    process.env.TELEGRAM_ADMIN_CHAT_ID,
                    '<b>SOS ALERT</b>\n\n' + adminMsg
                  )
                : Promise.resolve(null),
            // e. SMS to worker phone as last-resort backup
            userPhone
                ? notificationService.sendSMSAlert(userPhone, '[TDW SOS] Emergency sent. Help is coming.')
                : Promise.resolve(null)
        ]);

        console.error('[SOS_SYSTEM] Alert | User: ' + userName + ' | Loc: ' + loc);
        res.status(201).json({ message: 'SOS Alert triggered successfully.', sosId: sosAlert.id });
    } catch (error) {
        console.error('SOS Trigger Error:', error);
        res.status(500).json({ error: 'Failed to trigger SOS alert.' });
    }
};

/**
 * Resolve an SOS Alert
 */
exports.resolveSOS = async (req, res) => {
    try {
        const { id } = req.params;
        await prismaInstance.sOSAlert.update({
            where: { id },
            data: { status: 'RESOLVED', resolvedAt: new Date() }
        });
        res.json({ message: 'SOS Alert marked as resolved.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to resolve SOS alert.' });
    }
};

/**
 * Update Transit Location
 */
exports.updateTransitLocation = async (req, res) => {
    try {
        const { contractId, latitude, longitude } = req.body;
        const transit = await prismaInstance.transitSession.upsert({
            where:  { id: contractId },
            update: { latitude, longitude, updatedAt: new Date() },
            create: { id: contractId, contractId, userId: req.user.id, latitude, longitude }
        });
        res.json(transit);
    } catch (error) {
        console.error('Transit Update Error:', error);
        res.status(500).json({ error: 'Failed to update transit location.' });
    }
};

/**
 * Get Transit Location (for Employer)
 */
exports.getTransitLocation = async (req, res) => {
    try {
        const { contractId } = req.params;
        const transit = await prismaInstance.transitSession.findUnique({ where: { id: contractId } });
        res.json(transit);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch transit location.' });
    }
};

/**
 * Scan text/bio for poaching attempts
 */
exports.scanContentForPoaching = async (req, res) => {
    try {
        const { text } = req.body;
        const result = fraudDetectionService.scanTextForPoaching(text);
        res.json({ status: 'success', ...result });
    } catch (err) {
        res.status(500).json({ error: 'Failed to scan content for poaching' });
    }
};

/**
 * Audit account fraud risk
 */
exports.auditUserFraud = async (req, res) => {
    try {
        const { userId } = req.params;
        const { userType } = req.query;
        const audit = await fraudDetectionService.auditUserRisk(userId, userType || 'JOB_SEEKER');
        if (!audit) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ status: 'success', audit });
    } catch (err) {
        res.status(500).json({ error: 'Failed to audit user fraud risk' });
    }
};


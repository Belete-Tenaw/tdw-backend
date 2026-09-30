/**
 * Firebase Cloud Messaging (FCM) Push Notification Service
 * Device FCM tokens stored on JobSeeker/Employer as cmToken.
 * Frontend registers token via PATCH /api/auth/fcm-token on login.
 */

const { admin } = require('../utils/firebaseAdmin');

/** Send push to a single device token. */
exports.sendToDevice = async (fcmToken, title, body, data = {}) => {
    if (!fcmToken) return { success: false, error: 'No FCM token provided' };
    if (admin.apps.length === 0) {
        console.warn('[FCM] Firebase Admin not initialised — push skipped.');
        return { success: false, error: 'Firebase Admin not initialised' };
    }

    const message = {
        token: fcmToken,
        notification: { title, body },
        data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
        android: { priority: 'high', notification: { sound: 'default', channelId: 'tdw_alerts' } },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
        webpush: {
            notification: { icon: '/logo192.png', badge: '/badge72.png' },
            fcmOptions: { link: data.link || '/' }
        }
    };

    try {
        const messageId = await admin.messaging().send(message);
        return { success: true, messageId };
    } catch (error) {
        const staleToken = [
            'messaging/registration-token-not-registered',
            'messaging/invalid-registration-token'
        ].includes(error.code);
        console.error('[FCM] Send failed (' + error.code + '):', error.message);
        return { success: false, error: error.message, staleToken };
    }
};

/** Send push to multiple device tokens (up to 500 per call). */
exports.sendToMultipleDevices = async (fcmTokens, title, body, data = {}) => {
    if (!fcmTokens || fcmTokens.length === 0) return { successCount: 0, failureCount: 0, staleTokens: [] };
    if (admin.apps.length === 0) {
        console.warn('[FCM] Firebase Admin not initialised — multicast skipped.');
        return { successCount: 0, failureCount: fcmTokens.length, staleTokens: [] };
    }

    const message = {
        tokens: fcmTokens,
        notification: { title, body },
        data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
        android: { priority: 'high', notification: { sound: 'default', channelId: 'tdw_alerts' } },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } }
    };

    try {
        const batchResponse = await admin.messaging().sendEachForMulticast(message);
        const staleTokens = [];
        batchResponse.responses.forEach((resp, idx) => {
            if (!resp.success) {
                const code = resp.error && resp.error.code ? resp.error.code : '';
                if (code === 'messaging/registration-token-not-registered' ||
                    code === 'messaging/invalid-registration-token') {
                    staleTokens.push(fcmTokens[idx]);
                }
            }
        });
        return { successCount: batchResponse.successCount, failureCount: batchResponse.failureCount, staleTokens };
    } catch (error) {
        console.error('[FCM] Multicast failed:', error.message);
        return { successCount: 0, failureCount: fcmTokens.length, staleTokens: [] };
    }
};

/** Broadcast to a subscribed FCM topic (e.g., 'sos_admins', 'all_seekers'). */
exports.sendToTopic = async (topic, title, body, data = {}) => {
    if (admin.apps.length === 0) {
        console.warn('[FCM] Firebase Admin not initialised — topic send skipped.');
        return { success: false };
    }
    try {
        const messageId = await admin.messaging().send({
            topic,
            notification: { title, body },
            data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
        });
        return { success: true, messageId };
    } catch (error) {
        console.error('[FCM] Topic send failed (' + topic + '):', error.message);
        return { success: false, error: error.message };
    }
};

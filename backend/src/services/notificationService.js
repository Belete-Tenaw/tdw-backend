/**
 * Unified Notification Service — TDW
 * Fan-out engine: In-App | Telegram | FCM | SMS
 */

const TelegramBot = require('node-telegram-bot-api');
const prisma      = require('../utils/prisma');
const fcmService  = require('./fcmService');
const smsService  = require('./smsService');

const token = process.env.TELEGRAM_BOT_TOKEN;
let bot = null;
if (token) {
    bot = new TelegramBot(token);
} else {
    console.warn('[NotificationService] TELEGRAM_BOT_TOKEN missing. Telegram alerts disabled.');
}

// 1. In-App Notification
exports.createInAppNotification = async (userId, userType, title, message, type = 'SYSTEM', io = null) => {
    try {
        const notification = await prisma.notification.create({
            data: { userId, userType, title, message, type }
        });
        if (io) io.to(userId).emit('new_notification', notification);
        return notification;
    } catch (error) {
        console.error('[NotificationService] In-app failed:', error.message);
    }
};

// 2. Telegram Alert
exports.sendTelegramAlert = async (telegramChatId, message) => {
    if (!bot || !telegramChatId) return { success: false };
    try {
        await bot.sendMessage(telegramChatId, message, { parse_mode: 'HTML' });
        return { success: true };
    } catch (error) {
        console.error('[Telegram] Alert failed:', error.message);
        return { success: false, error: error.message };
    }
};

// 3. FCM Push
exports.sendPushNotification = async (fcmToken, title, body, data = {}) => {
    return fcmService.sendToDevice(fcmToken, title, body, data);
};

// 4. SMS Alert
exports.sendSMSAlert = async (phoneNumber, message) => {
    if (!phoneNumber) return { success: false };
    return smsService.sendSMS(phoneNumber, message);
};

/**
 * Unified fan-out: delivers across all channels simultaneously.
 * @param {object} prismaClient - Prisma client (unused; singleton used internally).
 * @param {object} io           - Socket.IO server instance.
 * @param {object} opts         - { userId, userType, title, message, type, telegramChatId, fcmToken, phone, data }
 */
exports.notify = async (prismaClient, io, opts = {}) => {
    const {
        userId, userType, title, message, type = 'SYSTEM',
        telegramChatId, fcmToken, phone, data = {}
    } = opts;

    const results = await Promise.allSettled([
        userId
            ? exports.createInAppNotification(userId, userType, title, message, type, io)
            : Promise.resolve(null),
        telegramChatId
            ? exports.sendTelegramAlert(telegramChatId, '<b>' + title + '</b>\n\n' + message)
            : Promise.resolve(null),
        fcmToken
            ? fcmService.sendToDevice(fcmToken, title, message, { type, ...data })
            : Promise.resolve(null),
        phone && ['SOS', 'PAYMENT', 'MATCH'].includes(type)
            ? smsService.sendSMS(phone, '[TDW] ' + title + ': ' + message)
            : Promise.resolve(null)
    ]);

    return {
        inApp:    results[0].status === 'fulfilled' ? results[0].value : results[0].reason,
        telegram: results[1].status === 'fulfilled' ? results[1].value : results[1].reason,
        fcm:      results[2].status === 'fulfilled' ? results[2].value : results[2].reason,
        sms:      results[3].status === 'fulfilled' ? results[3].value : results[3].reason
    };
};

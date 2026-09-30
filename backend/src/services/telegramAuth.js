const crypto = require('crypto');
const prisma = require('../utils/prisma');
const jwt = require('jsonwebtoken');

/**
 * Validates Telegram Mini App initData against HMAC-SHA256 signature
 * using the bot token.
 * 
 * Telegram WebApp Auth Specification:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function validateTelegramInitData(initData, botToken = process.env.TELEGRAM_BOT_TOKEN) {
    if (!initData) {
        return { valid: false, error: 'Empty initData provided.' };
    }
    if (!botToken) {
        return { valid: false, error: 'TELEGRAM_BOT_TOKEN is not configured on server.' };
    }

    try {
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        if (!hash) {
            return { valid: false, error: 'Missing hash parameter in initData.' };
        }

        // Build data_check_string
        const dataCheckArr = [];
        for (const [key, value] of params.entries()) {
            if (key !== 'hash') {
                dataCheckArr.push(`${key}=${value}`);
            }
        }
        dataCheckArr.sort();
        const dataCheckString = dataCheckArr.join('\n');

        // HMAC-SHA256 signature calculation
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();

        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        // Timing safe comparison
        const hashBuffer = Buffer.from(hash, 'utf8');
        const calcBuffer = Buffer.from(calculatedHash, 'utf8');

        if (hashBuffer.length !== calcBuffer.length || !crypto.timingSafeEqual(hashBuffer, calcBuffer)) {
            return { valid: false, error: 'Invalid HMAC signature.' };
        }

        // Validate auth_date freshness (default: within 24 hours)
        const authDate = parseInt(params.get('auth_date'), 10);
        const nowInSec = Math.floor(Date.now() / 1000);
        if (Number.isFinite(authDate) && process.env.NODE_ENV === 'production') {
            if (nowInSec - authDate > 86400) {
                return { valid: false, error: 'Telegram authentication data has expired.' };
            }
        }

        const rawUser = params.get('user');
        const telegramUser = rawUser ? JSON.parse(rawUser) : null;

        return {
            valid: true,
            user: telegramUser,
            authDate,
            startParam: params.get('start_param') || null
        };
    } catch (err) {
        return { valid: false, error: err.message };
    }
}

/**
 * Resolves a Telegram user to a TDW account (JobSeeker or Employer).
 * Returns JWT token if user account is already linked.
 */
async function authenticateTelegramUser(telegramUser) {
    if (!telegramUser || !telegramUser.id) {
        throw new Error('Invalid Telegram user payload.');
    }

    const tgId = telegramUser.id.toString();

    // Check JobSeeker
    const seeker = await prisma.jobSeeker.findUnique({
        where: { telegramChatId: tgId }
    });

    if (seeker) {
        if (!seeker.isActive) {
            throw new Error('Your account is currently suspended.');
        }

        const token = jwt.sign(
            { id: seeker.id, role: 'JOB_SEEKER' },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '30d' }
        );

        return {
            isLinked: true,
            token,
            user: {
                id: seeker.id,
                fullName: seeker.fullName,
                role: 'JOB_SEEKER',
                tier: seeker.tier,
                isVerified: seeker.isVerified,
                phone: seeker.phone,
                profilePhoto: seeker.profilePhoto
            }
        };
    }

    // Check Employer
    const employer = await prisma.employer.findUnique({
        where: { telegramChatId: tgId }
    });

    if (employer) {
        if (!employer.isActive) {
            throw new Error('Your account is currently suspended.');
        }

        const token = jwt.sign(
            { id: employer.id, role: 'EMPLOYER' },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '30d' }
        );

        return {
            isLinked: true,
            token,
            user: {
                id: employer.id,
                contactName: employer.contactName,
                role: 'EMPLOYER',
                tier: employer.tier,
                isVerified: employer.isVerified,
                phone: employer.phone,
                profilePhoto: employer.profilePhoto
            }
        };
    }

    // Not linked yet
    return {
        isLinked: false,
        telegramUser
    };
}

module.exports = {
    validateTelegramInitData,
    authenticateTelegramUser
};

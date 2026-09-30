const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validateTelegramInitData, authenticateTelegramUser } = require('../services/telegramAuth');
const { normalizeEmail, normalizePhone } = require('../utils/validation');

/**
 * POST /api/telegram/auth
 * Authenticates Telegram user from initData.
 */
router.post('/auth', async (req, res) => {
    try {
        const { initData } = req.body;

        if (!initData) {
            return res.status(400).json({ error: 'Telegram initData is required.' });
        }

        // Validate initData signature
        const validation = validateTelegramInitData(initData);
        if (!validation.valid) {
            // In local/dev environments without real bot tokens, allow graceful fallback if specified
            if (process.env.NODE_ENV !== 'production' && !process.env.TELEGRAM_BOT_TOKEN) {
                console.warn('[TelegramAuth] Dev fallback: skipping strict HMAC verification (no bot token set).');
                try {
                    const params = new URLSearchParams(initData);
                    const user = JSON.parse(params.get('user') || '{}');
                    if (user && user.id) {
                        const authResult = await authenticateTelegramUser(user);
                        return res.json({ success: true, ...authResult });
                    }
                } catch (devErr) {
                    console.error('[TelegramAuth] Dev fallback parse error:', devErr);
                }
            }
            return res.status(401).json({ error: validation.error || 'Authentication signature verification failed.' });
        }

        const authResult = await authenticateTelegramUser(validation.user);
        return res.json({
            success: true,
            ...authResult,
            startParam: validation.startParam
        });

    } catch (error) {
        console.error('[TelegramAuth Error]:', error);
        return res.status(500).json({ error: error.message || 'Telegram authentication error.' });
    }
});

/**
 * POST /api/telegram/link-account
 * Links an existing TDW account with a Telegram chat ID using login credentials.
 */
router.post('/link-account', async (req, res) => {
    try {
        const { identifier, password, telegramChatId, telegramUsername } = req.body;

        if (!identifier || !password || !telegramChatId) {
            return res.status(400).json({ error: 'identifier, password, and telegramChatId are required.' });
        }

        const normalizedIdentifier = identifier.includes('@')
            ? normalizeEmail(identifier)
            : normalizePhone(identifier);

        const tgId = telegramChatId.toString();

        // 1. Check JobSeeker
        const seeker = await prisma.jobSeeker.findFirst({
            where: {
                OR: [
                    { email: normalizedIdentifier },
                    { phone: normalizedIdentifier }
                ]
            }
        });

        if (seeker) {
            const isMatch = await bcrypt.compare(password, seeker.password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid password.' });
            }

            const updatedSeeker = await prisma.jobSeeker.update({
                where: { id: seeker.id },
                data: { telegramChatId: tgId }
            });

            const token = jwt.sign(
                { id: updatedSeeker.id, role: 'JOB_SEEKER' },
                process.env.JWT_SECRET || 'fallback_secret',
                { expiresIn: '30d' }
            );

            return res.json({
                success: true,
                message: 'TDW Job Seeker account successfully linked with Telegram!',
                token,
                user: {
                    id: updatedSeeker.id,
                    fullName: updatedSeeker.fullName,
                    role: 'JOB_SEEKER',
                    tier: updatedSeeker.tier,
                    isVerified: updatedSeeker.isVerified
                }
            });
        }

        // 2. Check Employer
        const employer = await prisma.employer.findFirst({
            where: {
                OR: [
                    { email: normalizedIdentifier },
                    { phone: normalizedIdentifier }
                ]
            }
        });

        if (employer) {
            const isMatch = await bcrypt.compare(password, employer.password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid password.' });
            }

            const updatedEmployer = await prisma.employer.update({
                where: { id: employer.id },
                data: { telegramChatId: tgId }
            });

            const token = jwt.sign(
                { id: updatedEmployer.id, role: 'EMPLOYER' },
                process.env.JWT_SECRET || 'fallback_secret',
                { expiresIn: '30d' }
            );

            return res.json({
                success: true,
                message: 'TDW Employer account successfully linked with Telegram!',
                token,
                user: {
                    id: updatedEmployer.id,
                    contactName: updatedEmployer.contactName,
                    role: 'EMPLOYER',
                    tier: updatedEmployer.tier,
                    isVerified: updatedEmployer.isVerified
                }
            });
        }

        return res.status(404).json({ error: 'No TDW account found with the provided credentials.' });

    } catch (error) {
        console.error('[TelegramLink Error]:', error);
        return res.status(500).json({ error: 'Failed to link account with Telegram.' });
    }
});

/**
 * GET /api/telegram/feed
 * Optimized Mini-App feed for domestic workers, top jobs, and quick metrics.
 */
router.get('/feed', async (req, res) => {
    try {
        const [recentJobs, featuredWorkers, totalWorkers, totalJobs] = await Promise.all([
            prisma.jobPost.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    salaryOffered: true,
                    arrangement: true,
                    address: true,
                    locationRegion: true,
                    createdAt: true
                }
            }),
            prisma.jobSeeker.findMany({
                where: { isActive: true },
                take: 10,
                orderBy: [
                    { isVerified: 'desc' },
                    { rating: 'desc' },
                    { createdAt: 'desc' }
                ],
                select: {
                    id: true,
                    fullName: true,
                    skills: true,
                    experienceYears: true,
                    expectedSalary: true,
                    preferredLocation: true,
                    preferredArrangement: true,
                    profilePhoto: true,
                    tier: true,
                    rating: true,
                    isVerified: true
                }
            }),
            prisma.jobSeeker.count({ where: { isActive: true } }),
            prisma.jobPost.count()
        ]);

        res.json({
            stats: {
                totalWorkers,
                totalJobs
            },
            recentJobs,
            featuredWorkers
        });
    } catch (error) {
        console.error('[TelegramFeed Error]:', error);
        res.status(500).json({ error: 'Failed to load Telegram feed.' });
    }
});

/**
 * GET /api/telegram/config
 * Returns public bot username & Telegram Mini App launch URL
 */
router.get('/config', (req, res) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TDW_EthioBot';
    const baseUrl = process.env.CLIENT_URL || 'https://trustworthydomesticworkers.web.app';
    const miniAppUrl = `${baseUrl}/tma`;

    res.json({
        botConfigured: Boolean(botToken),
        botUsername,
        miniAppUrl
    });
});

module.exports = router;

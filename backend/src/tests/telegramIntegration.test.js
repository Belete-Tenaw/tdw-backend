const crypto = require('crypto');
const { validateTelegramInitData } = require('../services/telegramAuth');
const request = require('supertest');
const app = require('../server');

const prisma = require('../utils/prisma');

jest.mock('../utils/prisma', () => ({
    jobSeeker: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
    },
    employer: {
        findUnique: jest.fn()
    },
    jobPost: {
        findMany: jest.fn(),
        count: jest.fn()
    }
}));

describe('Telegram Mini-App Integration', () => {
    const mockBotToken = '123456:TEST_BOT_TOKEN_ETHIOPIA';
    const testUser = { id: 555666777, first_name: 'Tigist', username: 'tigist_tg' };
    const authDate = Math.floor(Date.now() / 1000);

    // Calculate valid Telegram HMAC signature
    const dataCheckString = `auth_date=${authDate}\nuser=${JSON.stringify(testUser)}`;
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(mockBotToken).digest();
    const validHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    const validInitData = `user=${encodeURIComponent(JSON.stringify(testUser))}&auth_date=${authDate}&hash=${validHash}`;

    describe('validateTelegramInitData', () => {
        it('should successfully validate legitimate Telegram initData', () => {
            const result = validateTelegramInitData(validInitData, mockBotToken);
            expect(result.valid).toBe(true);
            expect(result.user).toEqual(testUser);
        });

        it('should reject tampered or invalid initData hash', () => {
            const invalidInitData = validInitData.replace(validHash, '0000000000000000000000000000000000000000000000000000000000000000');
            const result = validateTelegramInitData(invalidInitData, mockBotToken);
            expect(result.valid).toBe(false);
            expect(result.error).toMatch(/Invalid HMAC signature/);
        });

        it('should gracefully reject empty initData', () => {
            const result = validateTelegramInitData('', mockBotToken);
            expect(result.valid).toBe(false);
        });
    });

    describe('Telegram API Routes', () => {
        beforeEach(() => {
            prisma.jobPost.findMany.mockResolvedValue([
                { id: '1', title: 'Cook Needed', salaryOffered: 6000, arrangement: 'FULL_TIME' }
            ]);
            prisma.jobSeeker.findMany.mockResolvedValue([
                { id: '1', fullName: 'Almaz', skills: ['Cooking'], experienceYears: 3, expectedSalary: 6000 }
            ]);
            prisma.jobSeeker.count.mockResolvedValue(10);
            prisma.jobPost.count.mockResolvedValue(5);
        });

        it('GET /api/telegram/config should return bot configuration and mini-app url', async () => {
            const res = await request(app).get('/api/telegram/config');
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('miniAppUrl');
            expect(res.body.miniAppUrl).toMatch(/\/tma$/);
        });

        it('GET /api/telegram/feed should return stats, recent jobs, and featured workers', async () => {
            const res = await request(app).get('/api/telegram/feed');
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('stats');
            expect(res.body).toHaveProperty('recentJobs');
            expect(res.body).toHaveProperty('featuredWorkers');
        });
    });
});

const request = require('supertest');
const app = require('../server');
const fraudDetectionService = require('../services/fraudDetectionService');
const smartMatchEngine = require('../services/smartMatchEngine');
const jwt = require('jsonwebtoken');

jest.mock('../utils/prisma', () => ({
    jobSeeker: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
    },
    employer: {
        findUnique: jest.fn(),
        count: jest.fn()
    },
    jobPost: {
        findUnique: jest.fn(),
        findMany: jest.fn()
    },
    message: {
        count: jest.fn()
    }
}));

describe('AI Safety & Smart Match Engine Tests', () => {
    const testToken = jwt.sign(
        { id: 'user-123', role: 'EMPLOYER' },
        process.env.JWT_SECRET || 'test_secret'
    );

    describe('FraudDetectionService: scanTextForPoaching', () => {
        it('should detect direct Ethiopian phone numbers in messages', () => {
            const text = 'Hello, please call me at 0911223344 for the job';
            const result = fraudDetectionService.scanTextForPoaching(text);
            expect(result.isPoachingRisk).toBe(true);
            expect(result.flaggedPatterns.some(f => f.includes('0911223344'))).toBe(true);
        });

        it('should detect Telegram handles and Amharic contact sharing', () => {
            const text = 'በቴሌግራም አናግሩኝ @ethio_helper';
            const result = fraudDetectionService.scanTextForPoaching(text);
            expect(result.isPoachingRisk).toBe(true);
            expect(result.flaggedPatterns.some(f => f.includes('ቴሌግራም') || f.includes('@ethio_helper'))).toBe(true);
        });

        it('should detect escrow bypass attempts (e.g. Telebirr to personal phone)', () => {
            const text = 'Please send money via telebirr to my number directly, bypass the app';
            const result = fraudDetectionService.scanTextForPoaching(text);
            expect(result.isPoachingRisk).toBe(true);
            expect(result.riskScore).toBeGreaterThanOrEqual(60);
        });

        it('should pass normal polite conversation without false positives', () => {
            const text = 'Hello! I am excited about the nanny interview. Looking forward to meeting your family.';
            const result = fraudDetectionService.scanTextForPoaching(text);
            expect(result.isPoachingRisk).toBe(false);
            expect(result.riskScore).toBe(0);
        });
    });

    describe('SmartMatchEngine: calculateCompatibility', () => {
        const sampleJob = {
            title: 'Nanny Needed in Bole',
            requiredSkills: ['Nanny', 'Childcare'],
            salaryOffered: 7000,
            address: 'Bole, Addis Ababa',
            locationRegion: 'Addis Ababa',
            preferredArrangement: 'LIVE_IN',
            requiredLanguages: ['Amharic', 'English']
        };

        it('should grant high score to candidate with matching skills, adjacent sub-city, and agency endorsement', () => {
            const candidateInYeka = {
                skills: ['Nanny', 'Childcare', 'Cooking'],
                expectedSalary: 6500,
                preferredLocation: 'Yeka, Addis Ababa', // Adjacent to Bole
                preferredArrangement: 'LIVE_IN',
                tier: 'GOLD',
                badge: 'AGENCY_BACKED',
                languages: ['Amharic', 'English'],
                isVerified: true
            };

            const match = smartMatchEngine.calculateCompatibility(sampleJob, candidateInYeka);
            expect(match.compatibilityScore).toBeGreaterThanOrEqual(80);
            expect(match.isStrongMatch).toBe(true);
            expect(match.breakdown.some(b => b.factor === 'Location' && b.points >= 20)).toBe(true);
        });

        it('should compute lower score when skills and location mismatch', () => {
            const distantCandidate = {
                skills: ['Driver'],
                expectedSalary: 12000,
                preferredLocation: 'Hawassa',
                preferredArrangement: 'PART_TIME',
                tier: 'BRONZE'
            };

            const match = smartMatchEngine.calculateCompatibility(sampleJob, distantCandidate);
            expect(match.compatibilityScore).toBeLessThan(50);
            expect(match.isStrongMatch).toBe(false);
        });
    });

    describe('API Route: POST /api/safety/scan-content', () => {
        it('should return poaching scan analysis for incoming text', async () => {
            const res = await request(app)
                .post('/api/safety/scan-content')
                .set('Authorization', `Bearer ${testToken}`)
                .send({ text: 'Call me on 0911223344' });

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('success');
            expect(res.body.isPoachingRisk).toBe(true);
        });
    });
});

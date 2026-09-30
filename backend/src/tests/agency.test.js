const request = require('supertest');
const app = require('../server');
const prisma = require('../utils/prisma');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

jest.mock('../utils/prisma', () => ({
    employer: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn()
    },
    jobSeeker: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
    }
}));

describe('Enterprise B2B Agency Endpoints', () => {
    const testAgencyId = 'agency-uuid-123';
    const testToken = jwt.sign(
        { id: testAgencyId, role: 'AGENCY' },
        process.env.JWT_SECRET || 'test_secret'
    );

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/agency/register', () => {
        it('should register a new agency account and return JWT token', async () => {
            prisma.employer.findFirst.mockResolvedValue(null);
            prisma.employer.create.mockResolvedValue({
                id: testAgencyId,
                employerType: 'BUSINESS',
                contactName: 'Ethio Staffing (Abebe)',
                phone: '+251911000000',
                email: 'contact@ethiostaffing.com',
                referralCode: 'AGY-ETHI-7890',
                badge: 'LICENSED_AGENCY',
                isVerified: false
            });

            const res = await request(app)
                .post('/api/agency/register')
                .send({
                    agencyName: 'Ethio Staffing',
                    contactPerson: 'Abebe',
                    phone: '0911000000',
                    email: 'contact@ethiostaffing.com',
                    password: 'password123',
                    address: 'Bole, Addis Ababa',
                    licenseNumber: 'LIC-2024-99'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.status).toBe('success');
            expect(res.body).toHaveProperty('token');
            expect(res.body.agency.referralCode).toMatch(/^AGY-/);
        });

        it('should reject registration if phone already exists', async () => {
            prisma.employer.findFirst.mockResolvedValue({ id: 'existing-id' });

            const res = await request(app)
                .post('/api/agency/register')
                .send({
                    agencyName: 'Ethio Staffing',
                    phone: '0911000000',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(409);
        });
    });

    describe('GET /api/agency/dashboard', () => {
        it('should return agency metrics and worker breakdown', async () => {
            prisma.employer.findUnique.mockResolvedValue({
                id: testAgencyId,
                contactName: 'Ethio Staffing',
                phone: '+251911000000',
                email: 'contact@ethiostaffing.com',
                badge: 'LICENSED_AGENCY',
                isVerified: true,
                referralCode: 'AGY-ETHI-7890',
                isActive: true
            });

            prisma.jobSeeker.findMany.mockResolvedValue([
                { id: 'w1', fullName: 'Meseret', isVerified: true, completedJobs: 1, rating: 5.0, availability: { status: 'PLACED' } },
                { id: 'w2', fullName: 'Hanna', isVerified: false, completedJobs: 0, rating: 4.8, availability: { status: 'AVAILABLE' } }
            ]);

            const res = await request(app)
                .get('/api/agency/dashboard')
                .set('Authorization', `Bearer ${testToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('success');
            expect(res.body.metrics.totalManagedWorkers).toBe(2);
            expect(res.body.metrics.placedWorkers).toBe(1);
            expect(res.body.metrics.availableWorkers).toBe(1);
        });
    });

    describe('POST /api/agency/workers', () => {
        it('should onboard a worker under the agency', async () => {
            prisma.employer.findUnique.mockResolvedValue({ id: testAgencyId, isActive: true });
            prisma.jobSeeker.findFirst.mockResolvedValue(null);
            prisma.jobSeeker.create.mockResolvedValue({
                id: 'w-new',
                fullName: 'Almaz Desta',
                phone: '+251912345678',
                skills: ['Nanny', 'Cook'],
                expectedSalary: 6000,
                preferredLocation: 'Bole',
                badge: 'AGENCY_BACKED'
            });

            const res = await request(app)
                .post('/api/agency/workers')
                .set('Authorization', `Bearer ${testToken}`)
                .send({
                    fullName: 'Almaz Desta',
                    phone: '0912345678',
                    skills: ['Nanny', 'Cook'],
                    expectedSalary: 6000,
                    preferredLocation: 'Bole'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.status).toBe('success');
            expect(res.body.worker.fullName).toBe('Almaz Desta');
            expect(res.body.worker).toHaveProperty('tempPassword');
        });
    });

    describe('POST /api/agency/workers/bulk', () => {
        it('should bulk import workers and skip duplicates', async () => {
            prisma.employer.findUnique.mockResolvedValue({ id: testAgencyId, isActive: true });
            // First worker exists, second is new
            prisma.jobSeeker.findFirst
                .mockResolvedValueOnce({ id: 'existing' })
                .mockResolvedValueOnce(null);

            prisma.jobSeeker.create.mockResolvedValue({
                id: 'w-bulk-2',
                fullName: 'Bethlehem T.',
                phone: '+251922334455',
                skills: ['Housekeeper'],
                expectedSalary: 5500
            });

            const res = await request(app)
                .post('/api/agency/workers/bulk')
                .set('Authorization', `Bearer ${testToken}`)
                .send({
                    workers: [
                        { fullName: 'Duplicate Worker', phone: '0911000000' },
                        { fullName: 'Bethlehem T.', phone: '0922334455', skills: ['Housekeeper'], expectedSalary: 5500 }
                    ]
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.results.importedCount).toBe(1);
            expect(res.body.results.skippedCount).toBe(1);
        });
    });

    describe('PUT /api/agency/workers/:workerId/status', () => {
        it('should update worker status to PLACED', async () => {
            prisma.employer.findUnique.mockResolvedValue({ id: testAgencyId, isActive: true });
            prisma.jobSeeker.findUnique.mockResolvedValue({
                id: 'w-status',
                referredById: testAgencyId,
                completedJobs: 0
            });
            prisma.jobSeeker.update.mockResolvedValue({
                id: 'w-status',
                fullName: 'Tigist',
                availability: { status: 'PLACED' }
            });

            const res = await request(app)
                .put('/api/agency/workers/w-status/status')
                .set('Authorization', `Bearer ${testToken}`)
                .send({ status: 'PLACED' });

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('success');
            expect(res.body.worker.status).toBe('PLACED');
        });
    });
});

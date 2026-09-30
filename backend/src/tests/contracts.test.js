const request = require('supertest');
const app = require('../server');
const jwt = require('jsonwebtoken');
const contractSigningService = require('../services/contractSigningService');

const mockContract = {
    id: 'test-contract-1',
    employerId: 'emp-101',
    jobSeekerId: 'seeker-202',
    jobPostId: 'job-303',
    salary: 8500,
    startDate: new Date('2026-10-01'),
    endDate: new Date('2027-04-01'),
    status: 'PENDING_SIGNATURE',
    employerSigned: true,
    workerSigned: false,
    employer: { id: 'emp-101', contactName: 'Abebe Bikila', phone: '+251911000000' },
    jobSeeker: { id: 'seeker-202', fullName: 'Almaz Ayana', phone: '+251922000000' },
    terms: []
};

jest.mock('../utils/prisma', () => ({
    contract: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
    },
    contractTerm: {
        create: jest.fn(),
        update: jest.fn()
    },
    employer: {
        findUnique: jest.fn().mockResolvedValue({ id: 'emp-101', isActive: true })
    },
    jobSeeker: {
        findUnique: jest.fn().mockResolvedValue({ id: 'seeker-202', isActive: true })
    }
}));

const prisma = require('../utils/prisma');

describe('Digital Milestone Contract & Escrow Engine Tests', () => {
    const employerToken = jwt.sign(
        { id: 'emp-101', role: 'EMPLOYER' },
        process.env.JWT_SECRET || 'test_secret'
    );

    const seekerToken = jwt.sign(
        { id: 'seeker-202', role: 'JOB_SEEKER' },
        process.env.JWT_SECRET || 'test_secret'
    );

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/contracts', () => {
        it('should allow employer to create a new contract', async () => {
            prisma.contract.create.mockResolvedValueOnce({
                ...mockContract,
                salary: 8500,
                terms: [{ id: 'term-1', title: 'General Terms', content: 'Standard terms' }]
            });

            const res = await request(app)
                .post('/api/contracts')
                .set('Authorization', `Bearer ${employerToken}`)
                .send({
                    jobSeekerId: 'seeker-202',
                    jobPostId: 'job-303',
                    salaryAmount: 8500,
                    termsConditions: 'Standard terms'
                });

            expect(res.status).toBe(201);
            expect(res.body.id).toBe('test-contract-1');
            expect(res.body.salaryAmount).toBe(8500);
        });

        it('should reject worker attempting to create a contract', async () => {
            const res = await request(app)
                .post('/api/contracts')
                .set('Authorization', `Bearer ${seekerToken}`)
                .send({ jobSeekerId: 'seeker-202' });

            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/contracts', () => {
        it('should return list of contracts with mapped fields', async () => {
            prisma.contract.findMany.mockResolvedValueOnce([
                {
                    ...mockContract,
                    terms: [{ id: 'term-1', title: 'General Terms', content: 'Standard terms' }]
                }
            ]);

            const res = await request(app)
                .get('/api/contracts')
                .set('Authorization', `Bearer ${employerToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0].salaryAmount).toBe(8500);
            expect(res.body[0].termsConditions).toContain('Standard terms');
        });
    });

    describe('ContractSigningService: eSignContract', () => {
        it('should issue digital certificate hash and advance milestone on counter-signature', async () => {
            prisma.contract.findUnique.mockResolvedValueOnce({
                ...mockContract,
                employerSigned: true,
                workerSigned: false,
                terms: []
            });
            prisma.contractTerm.create.mockResolvedValue({});
            prisma.contract.update.mockResolvedValueOnce({
                ...mockContract,
                workerSigned: true,
                status: 'ACTIVE'
            });

            const result = await contractSigningService.eSignContract(
                'test-contract-1',
                'seeker-202',
                'JOB_SEEKER',
                'DATA_URL_SIGNATURE'
            );

            expect(result.status).toBe('success');
            expect(result.certificate).toMatch(/^CERT-TEST-CON-JOB_SEEKER-/);
            expect(result.bothSigned).toBe(true);
            expect(result.contract.milestoneStatus).toBe('TRIAL_PERIOD');
        });
    });

    describe('ContractSigningService: bilingual contract generator', () => {
        it('should produce English and Amharic legal text with certificate details', () => {
            const contract = {
                id: 'con-12345678',
                salary: 9000,
                startDate: new Date('2026-10-01'),
                terms: {
                    employerCertificate: 'CERT-EMP-1',
                    jobseekerCertificate: 'CERT-JS-2'
                }
            };
            const employer = { contactName: 'Dawit' };
            const seeker = { fullName: 'Selam' };

            const text = contractSigningService.generateContractText(contract, employer, seeker);

            expect(text).toContain('TRUSTWORTHY DOMESTIC WORKERS (TDW)');
            expect(text).toContain('Dawit');
            expect(text).toContain('Selam');
            expect(text).toContain('9000 ETB/month');
            expect(text).toContain('ቀጣሪ:       Dawit');
            expect(text).toContain('ሠራተኛ:     Selam');
            expect(text).toContain('ደሞዝ:       9000 ብር/ወር');
        });
    });
});

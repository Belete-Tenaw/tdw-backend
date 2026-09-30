const request = require('supertest');
const app = require('../server');
const prisma = require('../utils/prisma');

jest.mock('../utils/prisma', () => ({
    jobSeeker: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
    },
    employer: {
        findUnique: jest.fn(),
    },
    auditLog: {
        create: jest.fn()
    }
}));

describe('Auth Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should register a new job seeker', async () => {
        prisma.jobSeeker.findFirst.mockResolvedValue(null);
        prisma.jobSeeker.findUnique.mockResolvedValue(null);
        prisma.employer.findUnique.mockResolvedValue(null);
        prisma.jobSeeker.create.mockResolvedValue({
            id: '123',
            fullName: 'Test User',
            email: 'test@example.com',
            role: 'JOB_SEEKER'
        });

        const res = await request(app)
            .post('/api/auth/seeker/register')
            .field('fullName', 'Test User')
            .field('gender', 'MALE')
            .field('age', 25)
            .field('phone', '0911234567')
            .field('email', 'test@example.com')
            .field('password', 'password123')
            .field('experienceYears', 2)
            .field('expectedSalary', 5000)
            .field('preferredLocation', 'Addis Ababa')
            .field('preferredArrangement', 'LIVE_IN')
            .field('maritalStatus', 'SINGLE')
            .attach('profilePhoto', Buffer.from('fake image'), 'profile.jpg')
            .attach('idDocument', Buffer.from('fake id'), 'id.jpg');

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('user');
        expect(res.body.user).toMatchObject({
            id: '123',
            name: 'Test User',
            role: 'JOB_SEEKER'
        });
    });

    it('should register a new employer and return user object in response', async () => {
        prisma.employer.findFirst = jest.fn().mockResolvedValue(null);
        prisma.employer.create = jest.fn().mockResolvedValue({
            id: 'emp-456',
            contactName: 'Abebe Kebede',
            email: 'abebe@example.com',
            role: 'EMPLOYER',
            tier: 'FREE'
        });

        const res = await request(app)
            .post('/api/auth/employer/register')
            .send({
                contactName: 'Abebe Kebede',
                email: 'abebe@example.com',
                phone: '0922334455',
                password: 'password123',
                employerType: 'HOUSEHOLD',
                address: 'Bole, Addis Ababa'
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('user');
        expect(res.body.user).toMatchObject({
            id: 'emp-456',
            name: 'Abebe Kebede',
            role: 'EMPLOYER'
        });
    });
});

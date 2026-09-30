const prisma = require('../utils/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { normalizeEmail, normalizePhone } = require('../utils/validation');

/**
 * Enterprise B2B Agency Controller
 * Handles recruitment & placement agencies managing domestic worker pools.
 */

/**
 * POST /api/agency/register
 * Registers a new licensed domestic staffing agency.
 */
exports.registerAgency = async (req, res) => {
    try {
        const { agencyName, contactPerson, phone, email, password, address, licenseNumber } = req.body;

        if (!agencyName || !password) {
            return res.status(400).json({ error: 'Agency name and password are required.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        const formattedPhone = phone ? normalizePhone(phone) : null;
        const normalizedEmail = email ? normalizeEmail(email) : null;

        if (!formattedPhone && !normalizedEmail) {
            return res.status(400).json({ error: 'A valid phone number or email is required.' });
        }

        // Check duplicates
        if (formattedPhone) {
            const existingPhone = await prisma.employer.findFirst({ where: { phone: formattedPhone } });
            if (existingPhone) {
                return res.status(409).json({ error: 'An account with this phone number already exists.' });
            }
        }
        if (normalizedEmail) {
            const existingEmail = await prisma.employer.findFirst({ where: { email: normalizedEmail } });
            if (existingEmail) {
                return res.status(409).json({ error: 'An account with this email already exists.' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const codeSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const agencyCode = `AGY-${agencyName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}-${codeSuffix}`;

        const agency = await prisma.employer.create({
            data: {
                employerType: 'BUSINESS',
                contactName: `${agencyName}${contactPerson ? ` (${contactPerson})` : ''}`,
                phone: formattedPhone,
                email: normalizedEmail,
                password: hashedPassword,
                address: address || 'Addis Ababa, Ethiopia',
                referralCode: agencyCode,
                badge: 'LICENSED_AGENCY',
                isVerified: false,
                faydaId: licenseNumber ? `LIC-${licenseNumber}` : null
            }
        });

        const token = jwt.sign(
            { id: agency.id, role: 'AGENCY' },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '30d' }
        );

        res.status(201).json({
            status: 'success',
            message: 'Agency registered successfully.',
            token,
            agency: {
                id: agency.id,
                agencyName,
                contactPerson: contactPerson || '',
                phone: agency.phone,
                email: agency.email,
                referralCode: agency.referralCode,
                badge: agency.badge,
                isVerified: agency.isVerified
            }
        });
    } catch (error) {
        console.error('[Agency Register Error]', error);
        res.status(500).json({ error: error.message || 'Failed to register agency.' });
    }
};

/**
 * POST /api/agency/login
 * Agency authentication.
 */
exports.loginAgency = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ error: 'Identifier and password are required.' });
        }

        const normalizedIdentifier = identifier.includes('@')
            ? normalizeEmail(identifier)
            : normalizePhone(identifier);

        const agency = await prisma.employer.findFirst({
            where: {
                OR: [
                    { email: normalizedIdentifier },
                    { phone: normalizedIdentifier }
                ],
                employerType: 'BUSINESS'
            }
        });

        if (!agency) {
            return res.status(401).json({ error: 'Invalid credentials or account is not registered as an Agency.' });
        }

        if (!agency.isActive) {
            return res.status(403).json({ error: 'Agency account has been suspended. Please contact support.' });
        }

        const isMatch = await bcrypt.compare(password, agency.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { id: agency.id, role: 'AGENCY' },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '30d' }
        );

        res.json({
            status: 'success',
            token,
            agency: {
                id: agency.id,
                contactName: agency.contactName,
                phone: agency.phone,
                email: agency.email,
                referralCode: agency.referralCode,
                badge: agency.badge,
                isVerified: agency.isVerified
            }
        });
    } catch (error) {
        console.error('[Agency Login Error]', error);
        res.status(500).json({ error: 'Login failed.' });
    }
};

/**
 * GET /api/agency/dashboard
 * Real-time stats and metrics for the authenticated agency.
 */
exports.getAgencyDashboardStats = async (req, res) => {
    try {
        const agencyId = req.user.id;

        const [agency, managedWorkers] = await Promise.all([
            prisma.employer.findUnique({
                where: { id: agencyId },
                select: {
                    id: true,
                    contactName: true,
                    phone: true,
                    email: true,
                    address: true,
                    badge: true,
                    isVerified: true,
                    referralCode: true,
                    createdAt: true
                }
            }),
            prisma.jobSeeker.findMany({
                where: {
                    referredById: agencyId,
                    referredByType: 'AGENCY'
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    skills: true,
                    tier: true,
                    isVerified: true,
                    isFaydaVerified: true,
                    rating: true,
                    completedJobs: true,
                    expectedSalary: true,
                    preferredLocation: true,
                    availability: true,
                    createdAt: true
                }
            })
        ]);

        if (!agency) {
            return res.status(404).json({ error: 'Agency account not found.' });
        }

        const totalManaged = managedWorkers.length;
        const verifiedCount = managedWorkers.filter(w => w.isVerified || w.isFaydaVerified).length;
        const placedCount = managedWorkers.filter(w => {
            const availStatus = w.availability && typeof w.availability === 'object' ? w.availability.status : null;
            return availStatus === 'PLACED' || w.completedJobs > 0;
        }).length;
        const availableCount = totalManaged - placedCount;

        const ratings = managedWorkers.map(w => w.rating).filter(r => r > 0);
        const averageRating = ratings.length > 0
            ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
            : 5.0;

        res.json({
            status: 'success',
            agency: {
                name: agency.contactName,
                referralCode: agency.referralCode,
                phone: agency.phone,
                email: agency.email,
                address: agency.address,
                isVerified: agency.isVerified,
                badge: agency.badge
            },
            metrics: {
                totalManagedWorkers: totalManaged,
                verifiedWorkers: verifiedCount,
                placedWorkers: placedCount,
                availableWorkers: availableCount,
                placementRate: totalManaged > 0 ? Math.round((placedCount / totalManaged) * 100) : 0,
                averageRating
            },
            recentWorkers: managedWorkers.slice(0, 10)
        });
    } catch (error) {
        console.error('[Agency Stats Error]', error);
        res.status(500).json({ error: 'Failed to load B2B agency dashboard stats.' });
    }
};

/**
 * GET /api/agency/workers
 * Roster of all workers managed by the agency with status and search filters.
 */
exports.getAgencyWorkers = async (req, res) => {
    try {
        const agencyId = req.user.id;
        const { search, skill, status } = req.query;

        const whereClause = {
            referredById: agencyId,
            referredByType: 'AGENCY'
        };

        if (search) {
            whereClause.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { preferredLocation: { contains: search, mode: 'insensitive' } }
            ];
        }

        const workers = await prisma.jobSeeker.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                fullName: true,
                phone: true,
                skills: true,
                tier: true,
                gender: true,
                age: true,
                experienceYears: true,
                expectedSalary: true,
                preferredLocation: true,
                preferredArrangement: true,
                profilePhoto: true,
                isVerified: true,
                isFaydaVerified: true,
                rating: true,
                completedJobs: true,
                availability: true,
                createdAt: true
            }
        });

        // Filter in-memory for skills/status if needed
        let filtered = workers;
        if (skill && skill !== 'ALL') {
            filtered = filtered.filter(w => (w.skills || []).some(s => s.toLowerCase().includes(skill.toLowerCase())));
        }
        if (status && status !== 'ALL') {
            filtered = filtered.filter(w => {
                const s = w.availability && typeof w.availability === 'object' ? w.availability.status : 'AVAILABLE';
                return s === status;
            });
        }

        res.json({
            status: 'success',
            count: filtered.length,
            workers: filtered
        });
    } catch (error) {
        console.error('[Agency Workers Error]', error);
        res.status(500).json({ error: 'Failed to fetch agency worker roster.' });
    }
};

/**
 * POST /api/agency/workers
 * Onboard a single domestic worker under the agency.
 */
exports.registerAgencyWorker = async (req, res) => {
    try {
        const agencyId = req.user.id;
        const {
            fullName,
            phone,
            skills,
            experienceYears,
            expectedSalary,
            preferredLocation,
            preferredArrangement,
            gender,
            age,
            bio,
            maritalStatus
        } = req.body;

        if (!fullName) {
            return res.status(400).json({ error: 'Full name is required.' });
        }

        const formattedPhone = phone ? normalizePhone(phone) : null;
        if (formattedPhone) {
            const existing = await prisma.jobSeeker.findFirst({ where: { phone: formattedPhone } });
            if (existing) {
                return res.status(409).json({ error: 'A worker with this phone number is already registered.' });
            }
        }

        const tempPassword = Math.random().toString(36).substring(2, 10);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const worker = await prisma.jobSeeker.create({
            data: {
                fullName,
                phone: formattedPhone,
                password: hashedPassword,
                gender: gender === 'MALE' ? 'MALE' : 'FEMALE',
                age: age ? parseInt(age, 10) : 24,
                maritalStatus: maritalStatus || 'SINGLE',
                experienceYears: experienceYears ? parseInt(experienceYears, 10) : 2,
                expectedSalary: expectedSalary ? parseInt(expectedSalary, 10) : 6000,
                preferredLocation: preferredLocation || 'Addis Ababa',
                preferredArrangement: preferredArrangement || 'LIVE_IN',
                skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : ['Housekeeper']),
                bio: bio || 'Verified domestic worker managed by accredited agency.',
                profilePhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80',
                badge: 'AGENCY_BACKED',
                referredById: agencyId,
                referredByType: 'AGENCY',
                availability: { status: 'AVAILABLE' }
            }
        });

        res.status(201).json({
            status: 'success',
            message: 'Worker registered under agency account successfully.',
            worker: {
                id: worker.id,
                fullName: worker.fullName,
                phone: worker.phone,
                skills: worker.skills,
                expectedSalary: worker.expectedSalary,
                preferredLocation: worker.preferredLocation,
                badge: worker.badge,
                tempPassword // Can be given to the worker to log into TDW directly
            }
        });
    } catch (error) {
        console.error('[Agency Worker Register Error]', error);
        res.status(500).json({ error: error.message || 'Failed to register agency worker.' });
    }
};

/**
 * POST /api/agency/workers/bulk
 * Bulk onboarding for traditional agencies migrating worker books.
 */
exports.bulkRegisterWorkers = async (req, res) => {
    try {
        const agencyId = req.user.id;
        const { workers } = req.body;

        if (!Array.isArray(workers) || workers.length === 0) {
            return res.status(400).json({ error: 'An array of workers is required.' });
        }

        if (workers.length > 50) {
            return res.status(400).json({ error: 'Maximum 50 workers can be bulk-uploaded per batch.' });
        }

        const results = {
            totalReceived: workers.length,
            importedCount: 0,
            skippedCount: 0,
            importedWorkers: [],
            errors: []
        };

        for (const item of workers) {
            try {
                if (!item.fullName) {
                    results.skippedCount++;
                    results.errors.push({ item, reason: 'Missing fullName' });
                    continue;
                }

                const formattedPhone = item.phone ? normalizePhone(item.phone) : null;
                if (formattedPhone) {
                    const existing = await prisma.jobSeeker.findFirst({ where: { phone: formattedPhone } });
                    if (existing) {
                        results.skippedCount++;
                        results.errors.push({ item, reason: 'Duplicate phone number' });
                        continue;
                    }
                }

                const tempPassword = Math.random().toString(36).substring(2, 10);
                const hashedPassword = await bcrypt.hash(tempPassword, 10);

                const created = await prisma.jobSeeker.create({
                    data: {
                        fullName: item.fullName,
                        phone: formattedPhone,
                        password: hashedPassword,
                        gender: item.gender === 'MALE' ? 'MALE' : 'FEMALE',
                        age: item.age ? parseInt(item.age, 10) : 25,
                        maritalStatus: item.maritalStatus || 'SINGLE',
                        experienceYears: item.experienceYears ? parseInt(item.experienceYears, 10) : 2,
                        expectedSalary: item.expectedSalary ? parseInt(item.expectedSalary, 10) : 5500,
                        preferredLocation: item.preferredLocation || 'Addis Ababa',
                        preferredArrangement: item.preferredArrangement || 'LIVE_IN',
                        skills: Array.isArray(item.skills)
                            ? item.skills
                            : (typeof item.skills === 'string' ? item.skills.split(',').map(s => s.trim()) : ['Housekeeper']),
                        bio: item.bio || 'Verified domestic worker managed by accredited agency.',
                        profilePhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80',
                        badge: 'AGENCY_BACKED',
                        referredById: agencyId,
                        referredByType: 'AGENCY',
                        availability: { status: 'AVAILABLE' }
                    }
                });

                results.importedCount++;
                results.importedWorkers.push({
                    id: created.id,
                    fullName: created.fullName,
                    phone: created.phone,
                    skills: created.skills,
                    expectedSalary: created.expectedSalary
                });
            } catch (wErr) {
                results.skippedCount++;
                results.errors.push({ item, reason: wErr.message });
            }
        }

        res.status(201).json({
            status: 'success',
            message: `Successfully imported ${results.importedCount} workers.`,
            results
        });
    } catch (error) {
        console.error('[Agency Bulk Register Error]', error);
        res.status(500).json({ error: error.message || 'Failed to bulk-import workers.' });
    }
};

/**
 * PUT /api/agency/workers/:workerId/status
 * Updates a managed worker's placement status.
 */
exports.updateWorkerPlacementStatus = async (req, res) => {
    try {
        const agencyId = req.user.id;
        const { workerId } = req.params;
        const { status } = req.body;

        if (!status || !['AVAILABLE', 'PLACED', 'IN_TRAINING', 'ON_LEAVE'].includes(status)) {
            return res.status(400).json({ error: 'Valid status is required (AVAILABLE, PLACED, IN_TRAINING, ON_LEAVE).' });
        }

        const worker = await prisma.jobSeeker.findUnique({
            where: { id: workerId }
        });

        if (!worker) {
            return res.status(404).json({ error: 'Worker not found.' });
        }

        if (worker.referredById !== agencyId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized to update this worker.' });
        }

        const updated = await prisma.jobSeeker.update({
            where: { id: workerId },
            data: {
                availability: { status },
                completedJobs: status === 'PLACED' ? (worker.completedJobs + 1) : worker.completedJobs
            }
        });

        res.json({
            status: 'success',
            message: `Worker status updated to ${status}.`,
            worker: {
                id: updated.id,
                fullName: updated.fullName,
                status
            }
        });
    } catch (error) {
        console.error('[Agency Worker Status Update Error]', error);
        res.status(500).json({ error: 'Failed to update worker status.' });
    }
};

/**
 * GET /api/agency/public/:agencyId
 * Public agency profile and worker roster.
 */
exports.getPublicAgencyProfile = async (req, res) => {
    try {
        const { agencyId } = req.params;

        const agency = await prisma.employer.findFirst({
            where: {
                id: agencyId,
                employerType: 'BUSINESS'
            },
            select: {
                id: true,
                contactName: true,
                phone: true,
                address: true,
                badge: true,
                isVerified: true,
                createdAt: true
            }
        });

        if (!agency) {
            return res.status(404).json({ error: 'Agency not found.' });
        }

        const availableWorkers = await prisma.jobSeeker.findMany({
            where: {
                referredById: agencyId,
                referredByType: 'AGENCY',
                isActive: true
            },
            orderBy: { rating: 'desc' },
            select: {
                id: true,
                fullName: true,
                skills: true,
                experienceYears: true,
                expectedSalary: true,
                preferredLocation: true,
                preferredArrangement: true,
                profilePhoto: true,
                isVerified: true,
                rating: true,
                availability: true
            }
        });

        res.json({
            agency,
            availableWorkers: availableWorkers.filter(w => {
                const s = w.availability && typeof w.availability === 'object' ? w.availability.status : 'AVAILABLE';
                return s === 'AVAILABLE';
            })
        });
    } catch (error) {
        console.error('[Public Agency Profile Error]', error);
        res.status(500).json({ error: 'Failed to load agency public profile.' });
    }
};

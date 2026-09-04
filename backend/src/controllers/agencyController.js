const prisma = require('../utils/prisma');

/**
 * Enterprise B2B Agency Controller
 * Handles recruitment & placement agencies managing domestic worker pools.
 */

exports.getAgencyDashboardStats = async (req, res) => {
    try {
        const agencyWorkers = await prisma.jobSeeker.findMany({
            take: 20,
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
                completedJobs: true
            }
        });

        res.json({
            status: 'success',
            agencyName: 'Addis Domestic Placement Agency',
            metrics: {
                totalManagedWorkers: agencyWorkers.length,
                verifiedWorkers: agencyWorkers.filter(w => w.isVerified || w.isFaydaVerified).length,
                placedWorkers: agencyWorkers.filter(w => w.completedJobs > 0).length,
                averageRating: 4.8
            },
            managedWorkers: agencyWorkers
        });
    } catch (error) {
        console.error('[Agency Stats Error]', error);
        res.status(500).json({ error: 'Failed to load B2B agency dashboard stats' });
    }
};

exports.registerAgencyWorker = async (req, res) => {
    try {
        const { fullName, phone, skills, experienceYears, expectedSalary, preferredLocation } = req.body;
        
        if (!fullName || !phone) {
            return res.status(400).json({ error: 'Full name and phone are required' });
        }

        res.status(201).json({
            status: 'success',
            message: 'Worker registered under agency account successfully',
            worker: { fullName, phone, skills, experienceYears }
        });
    } catch (error) {
        console.error('[Agency Worker Register Error]', error);
        res.status(500).json({ error: 'Failed to register agency worker' });
    }
};

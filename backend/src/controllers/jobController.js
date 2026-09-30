const prisma = require('../utils/prisma');
const telegramService = require('../services/telegramService');
const notificationService = require('../services/notificationService');
const cacheService = require('../services/cacheService');
const { calculateTrustScore } = require('../utils/rankLogic');

exports.createJobPost = async (req, res) => {
    try {
        const { title, description, requiredSkills, salaryOffered, jobType, preferredArrangement, address, locationRegion, locationZone, locationWoreda } = req.body;
        const employerId = req.user.id;

        if (req.user.role !== 'EMPLOYER') {
            return res.status(403).json({ error: 'Only employers can post jobs' });
        }

        // Validate required fields
        if (!title || !title.trim()) return res.status(400).json({ error: 'Job title is required.' });
        if (!description || !description.trim()) return res.status(400).json({ error: 'Job description is required.' });
        if (!salaryOffered || isNaN(parseInt(salaryOffered))) return res.status(400).json({ error: 'A valid salary is required.' });
        // Daily Job Posting Limit (Fraud Prevention)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Combine limit check queries to reduce latency
        const [postsToday, activeJobs, employer] = await Promise.all([
            prisma.jobPost.count({
                where: { employerId, createdAt: { gte: today } }
            }),
            prisma.jobPost.count({ where: { employerId } }),
            prisma.employer.findUnique({ where: { id: employerId } })
        ]);

        if (postsToday >= 3) {
            return res.status(429).json({ // 429 is more accurate for rate limits
                error: 'Daily limit reached',
                message: 'You can only post up to 3 jobs per day to prevent system abuse.'
            });
        }

        if (employer.tier === 'FREE' && activeJobs >= 2) {
            return res.status(403).json({
                error: 'Limit reached',
                message: 'Free tier employers are limited to 2 active job posts. Upgrade to a Premium plan to post more.'
            });
        }

        const job = await prisma.jobPost.create({
            data: {
                title, description, requiredSkills,
                salaryOffered: parseInt(salaryOffered),
                jobType, preferredArrangement, address,
                locationRegion, locationZone, locationWoreda,
                employerId
            }
        });

        // 🎯 Proactive Match Notifications (Optimized)
        (async () => {
            try {
                const matches = await prisma.$queryRawUnsafe(
                    `SELECT * FROM match_seekers_for_job($1::uuid)`,
                    job.id
                );

                const topMatches = matches.filter(m => m.match_score >= 70);
                const io = req.app.get('io');
                
                for (const match of topMatches) {
                    const seeker = await prisma.jobSeeker.findUnique({
                        where: { id: match.seeker_id },
                        select: { id: true, telegramChatId: true, fullName: true, isActive: true }
                    });

                    if (seeker?.isActive) {
                        // 1. Persistent In-App Notification
                        await notificationService.createInAppNotification(
                            seeker.id,
                            'JOB_SEEKER',
                            'Perfect Job Match!',
                            `We found a new job "${job.title}" that matches your profile perfectly.`,
                            'MATCH',
                            io
                        );

                        // 2. Telegram Alert
                        if (seeker.telegramChatId) {
                            const message = `🔔 <b>Perfect Match!</b>\n\nHello ${seeker.fullName},\n\nWe found a job matching your skills: <b>"${job.title}"</b>.\n\n💰 Salary: ${job.salaryOffered} ETB\n📍 Location: ${job.locationWoreda || job.locationRegion || 'Near You'}\n\nApply now: https://trustworthydomesticworkersl.web.app/jobs/${job.id}`;
                            await telegramService.sendMessage(seeker.telegramChatId, message);
                        }
                    }
                }
            } catch (err) {
                console.error('[Match Notification Error]:', err.message);
            }
        })();

        // Flush cache on new post
        cacheService.del('all_jobs');

        res.status(201).json(job);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getAllJobs = async (req, res) => {
    try {
        const cachedJobs = cacheService.get('all_jobs');
        if (cachedJobs) return res.json(cachedJobs);

        const jobs = await prisma.jobPost.findMany({
            include: {
                employer: {
                    select: {
                        id: true,
                        contactName: true,
                        employerType: true,
                        isVerified: true,
                        rating: true,
                        completedJobs: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        cacheService.set('all_jobs', jobs, 600000); // 10 minutes
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getJobById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const job = await prisma.jobPost.findUnique({
            where: { id },
            include: { employer: true }
        });

        if (!job) return res.status(404).json({ error: 'Job not found' });

        // Log the view
        await prisma.viewLog.create({
            data: {
                [userRole === 'JOB_SEEKER' ? 'jobSeekerId' : 'employerId']: userId,
                targetJobPostId: id
            }
        });

        // Check tier and hide info if necessary
        let user;
        if (userRole === 'JOB_SEEKER') {
            user = await prisma.jobSeeker.findUnique({ where: { id: userId } });
        } else {
            user = await prisma.employer.findUnique({ where: { id: userId } });
        }

        if (user.tier === 'FREE' || user.tier === 'BRONZE') {
            // Masking employer details
            job.employer.phone = '********';
            job.employer.email = '********';
            job.employer.address = '********';
            job.address = '********'; // Job address also hidden?
        }

        res.json(job);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getMatchesForJob = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user.role !== 'EMPLOYER') {
            return res.status(403).json({ error: 'Only employers can see matches' });
        }

        const job = await prisma.jobPost.findUnique({
            where: { id },
            include: { employer: true }
        });
        
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const smartMatchEngine = require('../services/smartMatchEngine');
        const employer = await prisma.employer.findUnique({ 
            where: { id: req.user.id }, 
            select: { tier: true, subscriptionExpiry: true } 
        });
        const isSubscribed = employer?.subscriptionExpiry && new Date(employer.subscriptionExpiry) > new Date();
        const employerTier = isSubscribed ? (employer?.tier || 'FREE') : 'FREE';

        // Compute top matches using the multi-parametric smart match engine
        const candidates = await smartMatchEngine.findTopCandidatesForJob(id, 30);

        const enrichedMatches = candidates.map(item => {
            const seeker = item.seeker;
            const matchScore = item.compatibilityScore;
            
            // Mask contact details based on employer tier
            const hasContactAccess = employerTier !== 'FREE';
            
            const insights = [];
            if (matchScore >= 85) insights.push("Exceptional Match");
            else if (matchScore >= 70) insights.push("Strong Skill Fit");
            
            if (seeker.isFaydaVerified) insights.push("Fayda Verified");
            if (seeker.experienceYears >= 3) insights.push("Experienced Pro");
            if (seeker.rating >= 4.5) insights.push("Top Rated Worker");
            if (item.breakdown?.some(b => b.factor === 'Location' && b.points >= 20)) {
                insights.push("Neighborhood Proximity");
            }

            return {
                id: seeker.id,
                seeker_id: seeker.id,
                fullName: hasContactAccess ? seeker.fullName : (seeker.fullName ? seeker.fullName.split(' ')[0] + ' ***' : 'Verified Worker'),
                full_name: hasContactAccess ? seeker.fullName : (seeker.fullName ? seeker.fullName.split(' ')[0] + ' ***' : 'Verified Worker'),
                profilePhoto: seeker.profilePhoto,
                skills: seeker.skills || [],
                experienceYears: seeker.experienceYears || 0,
                preferredLocation: seeker.preferredLocation || 'Addis Ababa',
                preferredArrangement: seeker.preferredArrangement,
                rating: seeker.rating || 5.0,
                tier: seeker.tier || 'BRONZE',
                badge: seeker.badge || 'STANDARD',
                display_tier: seeker.tier || 'BRONZE',
                isVerified: seeker.isVerified,
                isFaydaVerified: seeker.isFaydaVerified,
                match_score: matchScore,
                compatibilityScore: matchScore,
                matchInsights: insights,
                breakdown: item.breakdown,
                is_visible: true
            };
        });

        res.json(enrichedMatches);
    } catch (error) {
        console.error("Smart Matching error:", error);
        res.status(500).json({ error: "Failed to calculate matching seekers" });
    }
};

/**
 * 🚀 High-Level AI Smart Matchmaker (Engine 2.0)
 * Evaluates candidate compatibility using multi-parametric weighted engine.
 */
exports.getSmartCandidatesForJob = async (req, res) => {
    try {
        const jobId = req.params.jobId || req.params.id;
        const smartMatchEngine = require('../services/smartMatchEngine');
        const candidates = await smartMatchEngine.findTopCandidatesForJob(jobId, 15);
        res.json({
            status: 'success',
            count: candidates.length,
            candidates
        });
    } catch (error) {
        console.error('[Smart Candidates Error]:', error);
        res.status(500).json({ error: 'Failed to compute AI matches for job post' });
    }
};


const prisma = require('../utils/prisma');
const { calculateWorkerRank, calculateTrustScore } = require('../utils/rankLogic');
const { uploadFileToFirebase } = require('../services/firebaseStorageService');
const faydaService = require('../services/faydaService');
const cacheService = require('../services/cacheService');

// Removed local calculateSeekerTier as it's now handled by calculateWorkerRank in utils

const maskPlatinumBadge = (seeker, employerTier) => {
    const maskedSeeker = { ...seeker };

    if (employerTier === 'SILVER_ACCESS' || employerTier === 'FREE') {
        // SILVER ACCESS / FREE (Base Subscription)
        maskedSeeker.phone = '********';
        maskedSeeker.email = '********';
        maskedSeeker.nationalIdUrl = null;
        maskedSeeker.faydaId = null;
        maskedSeeker.guarantorName = '********';
        maskedSeeker.guarantorPhone = '********';
        maskedSeeker.guarantorIdUrl = null;
        maskedSeeker.policeClearanceUrl = null;
        maskedSeeker.healthCertificateUrl = null;
        maskedSeeker.idDocument = null;

        if (maskedSeeker.badge === 'GOLD' || maskedSeeker.badge === 'PLATINUM') {
            maskedSeeker.badge = 'SILVER';
        }
    } else if (employerTier === 'GOLD_ACCESS') {
        // GOLD ACCESS (Mid-Tier Upgrade)
        maskedSeeker.policeClearanceUrl = null;
        maskedSeeker.healthCertificateUrl = null;

        if (maskedSeeker.badge === 'PLATINUM') {
            maskedSeeker.badge = 'GOLD';
        }
    }
    return maskedSeeker;
};

exports.getSeekerProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const seeker = await prisma.jobSeeker.findUnique({
            where: { id }
        });

        if (!seeker) return res.status(404).json({ error: 'Seeker not found' });

        if (userRole === 'EMPLOYER') {
            // Log the view asynchronously
            prisma.viewLog.create({
                data: {
                    employerId: userId,
                    targetJobSeekerId: id
                }
            }).catch(e => console.warn('ViewLog error:', e.message));

            const employer = await prisma.employer.findUnique({
                where: { id: userId },
                select: { tier: true, subscriptionExpiry: true }
            });

            const isSubscribed = employer?.subscriptionExpiry && new Date(employer.subscriptionExpiry) > new Date();
            const employerTier = isSubscribed ? (employer?.tier || 'FREE') : 'FREE';

            const masked = maskPlatinumBadge(seeker, employerTier);
            masked.trustScore = calculateTrustScore(seeker);

            // Double-Key Access Control Masking
            const hasPremium = req.hasPremiumAccess || isSubscribed;
            masked.phone = hasPremium ? seeker.phone : '********';
            masked.email = hasPremium ? seeker.email : '********';
            masked.locationKebele = hasPremium ? seeker.locationKebele : '********';

            // Sensitive legal documents require verified status & paid access
            if (!hasPremium || seeker.verificationStatus !== 'APPROVED') {
                masked.nationalIdUrl = null;
                masked.guarantorIdUrl = null;
                masked.policeClearanceUrl = null;
                masked.healthCertificateUrl = null;
                masked.idDocument = null;
            }

            return res.json(masked);
        }

        // For Seekers/Admins, return full profile with trustScore
        seeker.trustScore = calculateTrustScore(seeker);
        res.json(seeker);
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const id = req.user.id;
        if (req.user.role !== 'JOB_SEEKER') return res.status(403).json({ error: 'Forbidden' });

        const { fullName, bio, skills, experienceYears, expectedSalary, preferredLocation, preferredArrangement, guarantorPhone, videoBio, availability, videoTranscription } = req.body;

        const updateData = {
            fullName, bio,
            experienceYears: experienceYears ? parseInt(experienceYears) : undefined,
            expectedSalary: expectedSalary ? parseInt(expectedSalary) : undefined,
            preferredLocation, preferredArrangement, guarantorPhone, videoBio,
            availability, videoTranscription
        };

        if (skills) {
            let formattedSkills = skills;
            if (typeof skills === 'string') {
                try {
                    formattedSkills = JSON.parse(skills);
                } catch (e) {
                    formattedSkills = skills.split(',').map(s => s.trim());
                }
            }
            updateData.skills = Array.isArray(formattedSkills) ? formattedSkills : [];
        }

        if (req.files) {
            try {
                if (req.files.profilePhoto) {
                    updateData.profilePhoto = (await uploadFileToFirebase(req.files.profilePhoto[0], 'profile-photos', true)).publicUrl;
                }
                if (req.files.idDocument) {
                    updateData.idDocument = (await uploadFileToFirebase(req.files.idDocument[0], 'legal-docs', false)).storagePath;
                }
                if (req.files.nationalIdUrl) {
                    updateData.nationalIdUrl = (await uploadFileToFirebase(req.files.nationalIdUrl[0], 'legal-docs', false)).storagePath;
                }
                if (req.files.guarantorIdUrl) {
                    updateData.guarantorIdUrl = (await uploadFileToFirebase(req.files.guarantorIdUrl[0], 'legal-docs', false)).storagePath;
                }
                if (req.files.policeClearanceUrl) {
                    updateData.policeClearanceUrl = (await uploadFileToFirebase(req.files.policeClearanceUrl[0], 'legal-docs', false)).storagePath;
                }
                if (req.files.healthCertificateUrl) {
                    updateData.healthCertificateUrl = (await uploadFileToFirebase(req.files.healthCertificateUrl[0], 'legal-docs', false)).storagePath;
                }
                if (req.files.videoBio) {
                    updateData.videoBio = (await uploadFileToFirebase(req.files.videoBio[0], 'videos', false)).storagePath;
                }
                
                if (req.files.idDocument || req.files.nationalIdUrl || req.files.guarantorIdUrl || req.files.policeClearanceUrl || req.files.healthCertificateUrl) {
                    updateData.isVerified = false;
                    updateData.verificationStatus = 'PENDING';
                }
            } catch (err) {
                return res.status(500).json({ error: "File upload failed: " + err.message });
            }
        }

        // Fetch current document status for tier calculation
        const currentSeeker = await prisma.jobSeeker.findUnique({
            where: { id },
            select: {
                nationalIdUrl: true,
                idDocument: true,
                profilePhoto: true,
                guarantorIdUrl: true,
                guarantorPhone: true,
                policeClearanceUrl: true,
                healthCertificateUrl: true
            }
        });

        // Merged data for tier calculation
        const mergedData = {
            ...currentSeeker,
            ...updateData
        };

        // Recalculate Tier using unified logic
        updateData.tier = calculateWorkerRank(mergedData);

        const updated = await prisma.jobSeeker.update({
            where: { id },
            data: updateData
        });

        // Flush cache on update
        cacheService.del('all_seekers');

        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getAllSeekers = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        const rawSeekers = await prisma.jobSeeker.findMany({
            where: { isActive: true },
            orderBy: { fullName: 'asc' }
        });

        let enrichedSeekers;

        if (userRole === 'EMPLOYER') {
            const employer = await prisma.employer.findUnique({
                where: { id: userId },
                select: { tier: true, subscriptionExpiry: true }
            });
            const isSubscribed = employer?.subscriptionExpiry && new Date(employer.subscriptionExpiry) > new Date();
            const employerTier = isSubscribed ? (employer?.tier || 'FREE') : 'FREE';

            enrichedSeekers = rawSeekers.map(s => {
                const masked = maskPlatinumBadge(s, employerTier);
                masked.trustScore = calculateTrustScore(s);
                return masked;
            });
        } else {
            enrichedSeekers = rawSeekers.map(s => ({
                ...s,
                trustScore: calculateTrustScore(s)
            }));
        }

        res.json(enrichedSeekers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.requestFaydaOTP = async (req, res) => {
    try {
        const { faydaId } = req.body;
        const userId = req.user.id;

        if (!faydaId || faydaId.length !== 12) {
            return res.status(400).json({ error: "Invalid Fayda ID. Must be 12 digits." });
        }

        // Check if Fayda ID is already linked to another account
        const existing = await prisma.jobSeeker.findUnique({
            where: { faydaId }
        });

        if (existing && existing.id !== userId) {
            return res.status(409).json({ error: "This Fayda ID is already linked to another account." });
        }

        const result = await faydaService.requestOTP(faydaId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.verifyFayda = async (req, res) => {
    try {
        const { faydaId, otpCode } = req.body;
        const userId = req.user.id;

        const verification = await faydaService.verifyOTP(faydaId, otpCode);
        if (!verification.success) {
            return res.status(400).json({ error: verification.message });
        }

        // Update seeker
        const seeker = await prisma.jobSeeker.findUnique({ where: { id: userId } });
        
        const updatedData = {
            faydaId: faydaId,
            isFaydaVerified: true
        };

        // Recalculate rank
        const mergedData = { ...seeker, ...updatedData };
        updatedData.tier = calculateWorkerRank(mergedData);

        const updatedSeeker = await prisma.jobSeeker.update({
            where: { id: userId },
            data: updatedData
        });

        res.json({
            message: "Fayda ID verified successfully! You have been promoted to " + updatedSeeker.tier + " rank.",
            tier: updatedSeeker.tier
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getConciergePicks = async (req, res) => {
    try {
        // Rank by points, rating, and verification status
        const topPicks = await prisma.jobSeeker.findMany({
            where: { isActive: true },
            orderBy: [
                { isVerified: 'desc' },
                { rewardPoints: 'desc' },
                { rating: 'desc' }
            ],
            take: 3
        });
        res.json(topPicks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * 🎯 Smart AI Job Matches for Job Seekers
 */
exports.getSmartJobsForSeeker = async (req, res) => {
    try {
        const seekerId = req.user.id;
        const smartMatchEngine = require('../services/smartMatchEngine');
        const smartJobs = await smartMatchEngine.findTopJobsForSeeker(seekerId, 15);
        res.json({
            status: 'success',
            count: smartJobs.length,
            jobs: smartJobs
        });
    } catch (error) {
        console.error('[Smart Jobs Error]', error);
        res.status(500).json({ error: 'Failed to calculate smart job matches' });
    }
};

/**
 * 🎙️ Voice Assistant Audio Bio Processor
 */
exports.processVoiceBio = async (req, res) => {
    try {
        const seekerId = req.user.id;
        const { audioUrl, language } = req.body;
        const voiceAssistantService = require('../services/voiceAssistantService');
        const result = await voiceAssistantService.processAudioBio(audioUrl, language);

        if (result.status === 'processed' && seekerId) {
            await prisma.jobSeeker.update({
                where: { id: seekerId },
                data: {
                    videoBio: audioUrl || undefined,
                    bio: result.transcription || undefined
                }
            });
        }
        res.json(result);
    } catch (error) {
        console.error('[Process Voice Bio Error]', error);
        res.status(500).json({ error: 'Failed to process voice bio' });
    }
};

/**
 * 🎓 Skill Certification Micro-Quizzes
 */
exports.getQuizzes = async (req, res) => {
    res.json({
        quizzes: [
            { id: 'childcare_101', title: 'Childcare & Infant Safety', category: 'Childcare', points: 25, questionsCount: 3 },
            { id: 'cooking_101', title: 'Ethiopian Culinary & Hygiene', category: 'Cooking', points: 20, questionsCount: 3 },
            { id: 'elderly_101', title: 'Elder Care & First Aid', category: 'Elderly', points: 30, questionsCount: 3 },
            { id: 'cleaning_101', title: 'Home Management & Sanitation', category: 'Cleaning', points: 15, questionsCount: 3 }
        ]
    });
};

exports.verifyQuiz = async (req, res) => {
    try {
        const seekerId = req.user.id;
        const { quizId, score } = req.body;
        if (score >= 70) {
            const seeker = await prisma.jobSeeker.findUnique({ where: { id: seekerId } });
            const updatedPoints = ((seeker && seeker.rewardPoints) || 0) + 25;
            await prisma.jobSeeker.update({
                where: { id: seekerId },
                data: { rewardPoints: updatedPoints }
            });
            return res.json({ status: 'success', message: 'Quiz passed! Skill badge unlocked.', bonusPoints: 25, totalPoints: updatedPoints });
        }
        res.status(400).json({ status: 'failed', message: 'Passing score is 70%. Please try again.' });
    } catch (error) {
        console.error('[Quiz Verification Error]', error);
        res.status(500).json({ error: 'Failed to process quiz verification' });
    }
};


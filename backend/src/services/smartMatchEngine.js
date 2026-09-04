const prisma = require('../utils/prisma');

/**
 * Smart AI Matchmaker Engine 2.0
 * Multi-parametric weighted matching algorithm evaluating skills fit, location proximity,
 * salary alignment, behavior trust score, and availability schedule.
 */
class SmartMatchEngine {
    
    /**
     * Calculates compatibility score between a Job Post and a Job Seeker.
     * Returns score (0 - 100) and match reason breakdown.
     */
    calculateCompatibility(jobPost, seeker) {
        let score = 0;
        const breakdown = [];

        // 1. Skill Fit (Weight: 30%)
        const required = jobPost.requiredSkills || [];
        const seekerSkills = seeker.skills || [];
        if (required.length === 0) {
            score += 30;
            breakdown.push({ factor: 'Skills', points: 30, detail: 'Universal skill requirements' });
        } else {
            const matchedSkills = required.filter(s => 
                seekerSkills.some(sk => sk.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(sk.toLowerCase()))
            );
            const skillRatio = matchedSkills.length / required.length;
            const skillPoints = Math.round(skillRatio * 30);
            score += skillPoints;
            breakdown.push({
                factor: 'Skills',
                points: skillPoints,
                detail: `Matched ${matchedSkills.length}/${required.length} required skills`
            });
        }

        // 2. Location Proximity Score (Weight: 25%)
        let locationPoints = 5; // Baseline
        if (jobPost.locationRegion && seeker.locationRegion && jobPost.locationRegion.toLowerCase() === seeker.locationRegion.toLowerCase()) {
            locationPoints += 10;
            if (jobPost.locationZone && seeker.locationZone && jobPost.locationZone.toLowerCase() === seeker.locationZone.toLowerCase()) {
                locationPoints += 5;
                if (jobPost.locationWoreda && seeker.locationWoreda && jobPost.locationWoreda.toLowerCase() === seeker.locationWoreda.toLowerCase()) {
                    locationPoints += 5;
                }
            }
        } else if (jobPost.address && seeker.preferredLocation && (
            jobPost.address.toLowerCase().includes(seeker.preferredLocation.toLowerCase()) ||
            seeker.preferredLocation.toLowerCase().includes(jobPost.address.toLowerCase())
        )) {
            locationPoints += 15;
        }
        score += locationPoints;
        breakdown.push({ factor: 'Location', points: locationPoints, detail: 'Regional & Kebele proximity alignment' });

        // 3. Salary Window Compatibility (Weight: 20%)
        const salaryOffered = jobPost.salaryOffered || 0;
        const salaryExpected = seeker.expectedSalary || 0;
        let salaryPoints = 0;
        if (salaryExpected <= 0 || salaryOffered >= salaryExpected) {
            salaryPoints = 20; // Full points if offer meets or exceeds expectation
        } else {
            const diffRatio = (salaryExpected - salaryOffered) / salaryExpected;
            if (diffRatio <= 0.15) salaryPoints = 16;
            else if (diffRatio <= 0.30) salaryPoints = 10;
            else salaryPoints = 4;
        }
        score += salaryPoints;
        breakdown.push({ factor: 'Salary', points: salaryPoints, detail: `${salaryOffered} ETB offered vs ${salaryExpected} ETB expected` });

        // 4. Behavior & Vetting Trust Tier Multiplier (Weight: 15%)
        let trustPoints = 5;
        if (seeker.tier === 'PLATINUM') trustPoints = 15;
        else if (seeker.tier === 'GOLD') trustPoints = 13;
        else if (seeker.tier === 'SILVER') trustPoints = 10;
        else if (seeker.isFaydaVerified || seeker.isVerified) trustPoints = 8;
        
        // Add behavior score boost (up to +5 bonus)
        const behaviorBonus = Math.round(((seeker.behaviorScore || 50) / 100) * 5);
        const finalTrustPoints = Math.min(trustPoints + behaviorBonus, 15);
        score += finalTrustPoints;
        breakdown.push({ factor: 'Trust & Verification', points: finalTrustPoints, detail: `${seeker.tier} Tier (${seeker.behaviorScore || 50}% Trust Score)` });

        // 5. Arrangement Alignment (Weight: 10%)
        let arrangementPoints = 5;
        if (jobPost.preferredArrangement === seeker.preferredArrangement) {
            arrangementPoints = 10;
        }
        score += arrangementPoints;
        breakdown.push({ factor: 'Arrangement', points: arrangementPoints, detail: `${jobPost.preferredArrangement} commitment fit` });

        const finalScore = Math.min(Math.round(score), 100);

        return {
            compatibilityScore: finalScore,
            isStrongMatch: finalScore >= 75,
            tierBadge: seeker.tier || 'STANDARD',
            breakdown
        };
    }

    /**
     * Finds top matched candidates for a given Job Post ID.
     */
    async findTopCandidatesForJob(jobPostId, limit = 10) {
        const jobPost = await prisma.jobPost.findUnique({
            where: { id: jobPostId },
            include: { employer: true }
        });

        if (!jobPost) return [];

        const seekers = await prisma.jobSeeker.findMany({
            where: { isActive: true },
            take: 50
        });

        const scoredCandidates = seekers.map(seeker => {
            const match = this.calculateCompatibility(jobPost, seeker);
            return {
                seeker: {
                    id: seeker.id,
                    fullName: seeker.fullName,
                    age: seeker.age,
                    gender: seeker.gender,
                    skills: seeker.skills,
                    experienceYears: seeker.experienceYears,
                    preferredArrangement: seeker.preferredArrangement,
                    preferredLocation: seeker.preferredLocation,
                    profilePhoto: seeker.profilePhoto,
                    isVerified: seeker.isVerified,
                    isFaydaVerified: seeker.isFaydaVerified,
                    tier: seeker.tier,
                    rating: seeker.rating
                },
                ...match
            };
        });

        // Sort descending by compatibility score
        scoredCandidates.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
        return scoredCandidates.slice(0, limit);
    }

    /**
     * Finds top matched job posts for a Job Seeker ID.
     */
    async findTopJobsForSeeker(seekerId, limit = 10) {
        const seeker = await prisma.jobSeeker.findUnique({
            where: { id: seekerId }
        });

        if (!seeker) return [];

        const jobPosts = await prisma.jobPost.findMany({
            take: 50,
            orderBy: { createdAt: 'desc' },
            include: { employer: { select: { contactName: true, rating: true, isVerified: true } } }
        });

        const scoredJobs = jobPosts.map(jobPost => {
            const match = this.calculateCompatibility(jobPost, seeker);
            return {
                jobPost,
                ...match
            };
        });

        scoredJobs.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
        return scoredJobs.slice(0, limit);
    }
}

module.exports = new SmartMatchEngine();

const prisma = require('../utils/prisma');

/**
 * Addis Ababa Sub-City Geographic Proximity Adjacency Matrix
 */
const ADDIS_SUBCITY_ADJACENCY = {
    'bole': ['yeka', 'kirkos', 'nifas silk', 'nifas silk-lafto', 'akaki kality', 'cmc', 'ayat'],
    'yeka': ['bole', 'gullele', 'arada', 'shola', 'megenagna', 'cmc'],
    'kirkos': ['bole', 'arada', 'lideta', 'nifas silk', 'nifas silk-lafto', 'sarbet', 'meskel flower', 'kazanchis'],
    'arada': ['yeka', 'gullele', 'addis ketema', 'lideta', 'kirkos', 'piassa'],
    'lideta': ['arada', 'kirkos', 'addis ketema', 'kolfe keranio', 'nifas silk', 'mexico'],
    'addis ketema': ['arada', 'gullele', 'kolfe keranio', 'lideta', 'merkato'],
    'gullele': ['yeka', 'arada', 'addis ketema', 'kolfe keranio', 'shiro meda'],
    'kolfe keranio': ['gullele', 'addis ketema', 'lideta', 'nifas silk', 'tor hailoch'],
    'nifas silk': ['kirkos', 'lideta', 'kolfe keranio', 'akaki kality', 'bole', 'sarbet', 'gotera', 'jomo'],
    'nifas silk-lafto': ['kirkos', 'lideta', 'kolfe keranio', 'akaki kality', 'bole', 'sarbet', 'gotera', 'jomo'],
    'akaki kality': ['bole', 'nifas silk', 'nifas silk-lafto', 'kality']
};

/**
 * Smart AI Matchmaker Engine 2.0
 * Multi-parametric weighted matching algorithm:
 * 1. Skills Fit (30%)
 * 2. Geographic Proximity & Sub-city Adjacency (25%)
 * 3. Salary Window Alignment (20%)
 * 4. Behavior, Trust Tier & Agency Accreditation (15%)
 * 5. Arrangement & Language Alignment (10%)
 */
class SmartMatchEngine {

    /**
     * Calculates compatibility score between a Job Post and a Job Seeker.
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

        // 2. Geographic Proximity Score with Addis Sub-city Adjacency (Weight: 25%)
        let locationPoints = 6;
        const jobLoc = (jobPost.address || jobPost.locationRegion || 'Addis Ababa').toLowerCase();
        const seekerLoc = (seeker.preferredLocation || seeker.locationRegion || 'Addis Ababa').toLowerCase();

        if (jobLoc.includes(seekerLoc) || seekerLoc.includes(jobLoc)) {
            locationPoints = 25; // Exact sub-city / area match
            breakdown.push({ factor: 'Location', points: 25, detail: `Exact neighborhood match (${seeker.preferredLocation || 'Addis Ababa'})` });
        } else {
            // Check sub-city adjacency
            let isAdjacent = false;
            for (const [subcity, neighbors] of Object.entries(ADDIS_SUBCITY_ADJACENCY)) {
                if (jobLoc.includes(subcity) && neighbors.some(n => seekerLoc.includes(n))) {
                    isAdjacent = true;
                    break;
                }
                if (seekerLoc.includes(subcity) && neighbors.some(n => jobLoc.includes(n))) {
                    isAdjacent = true;
                    break;
                }
            }

            if (isAdjacent) {
                locationPoints = 20;
                breakdown.push({ factor: 'Location', points: 20, detail: 'Adjacent Addis Ababa sub-city proximity' });
            } else if (jobLoc.includes('addis') && seekerLoc.includes('addis')) {
                locationPoints = 14;
                breakdown.push({ factor: 'Location', points: 14, detail: 'Within Addis Ababa metropolitan area' });
            } else {
                breakdown.push({ factor: 'Location', points: locationPoints, detail: 'Regional proximity' });
            }
        }
        score += locationPoints;

        // 3. Salary Window Compatibility (Weight: 20%)
        const salaryOffered = jobPost.salaryOffered || 0;
        const salaryExpected = seeker.expectedSalary || 0;
        let salaryPoints = 0;
        if (salaryExpected <= 0 || salaryOffered >= salaryExpected) {
            salaryPoints = 20;
        } else {
            const diffRatio = (salaryExpected - salaryOffered) / salaryExpected;
            if (diffRatio <= 0.15) salaryPoints = 16;
            else if (diffRatio <= 0.30) salaryPoints = 10;
            else salaryPoints = 4;
        }
        score += salaryPoints;
        breakdown.push({ factor: 'Salary', points: salaryPoints, detail: `${salaryOffered} ETB offered vs ${salaryExpected} ETB expected` });

        // 4. Behavior, Trust Tier & Accreditation Boost (Weight: 15%)
        let trustPoints = 5;
        if (seeker.tier === 'PLATINUM') trustPoints = 12;
        else if (seeker.tier === 'GOLD') trustPoints = 10;
        else if (seeker.tier === 'SILVER') trustPoints = 8;
        else if (seeker.isFaydaVerified || seeker.isVerified) trustPoints = 7;

        // Agency accreditation or Fayda bonus (+3)
        if (seeker.badge === 'AGENCY_BACKED') {
            trustPoints += 3;
        }
        if (seeker.isFaydaVerified) {
            trustPoints += 2;
        }

        const behaviorBonus = Math.round(((seeker.behaviorScore || 50) / 100) * 3);
        const finalTrustPoints = Math.min(trustPoints + behaviorBonus, 15);
        score += finalTrustPoints;
        breakdown.push({
            factor: 'Trust & Verification',
            points: finalTrustPoints,
            detail: `${seeker.tier || 'BRONZE'} Tier${seeker.badge === 'AGENCY_BACKED' ? ' (Agency Endorsed)' : ''}`
        });

        // 5. Arrangement & Language Alignment (Weight: 10%)
        let arrangementPoints = 5;
        if (jobPost.preferredArrangement === seeker.preferredArrangement) {
            arrangementPoints += 3;
        }

        // Language matching bonus
        const workerLanguages = seeker.languages || ['Amharic'];
        const requiredLanguages = jobPost.requiredLanguages || ['Amharic'];
        const hasCommonLanguage = requiredLanguages.some(l => 
            workerLanguages.some(wl => wl.toLowerCase() === l.toLowerCase())
        );
        if (hasCommonLanguage) {
            arrangementPoints += 2;
        }

        const finalArrangementPoints = Math.min(arrangementPoints, 10);
        score += finalArrangementPoints;
        breakdown.push({
            factor: 'Arrangement & Language',
            points: finalArrangementPoints,
            detail: `${seeker.preferredArrangement} arrangement with language compatibility`
        });

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
                    badge: seeker.badge,
                    rating: seeker.rating
                },
                ...match
            };
        });

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

const prisma = require('../utils/prisma');

/**
 * AI Fraud, Poaching & Anomaly Detection Engine 2.0
 * Evaluates risk vectors across accounts:
 * - Off-platform poaching & contact leakage detection
 * - Identity verification collisions & multi-account detection
 * - Messaging velocity anomalies
 * - Behavioral complaints and dispute tracking
 */
class FraudDetectionService {

    /**
     * Scans text content (messages, bio, job descriptions) for off-platform poaching
     * and premature contact sharing.
     */
    scanTextForPoaching(text) {
        if (!text || typeof text !== 'string') {
            return { isPoachingRisk: false, riskScore: 0, flaggedPatterns: [] };
        }

        const flags = [];
        let riskScore = 0;

        // 1. Phone number pattern detection (Ethiopian formats +251 9/7... or 09/07...)
        const phoneRegex = /(?:\+?251|0)[\s.-]?[79]\d(?:[\s.-]?\d){7}/g;
        const phoneMatches = text.match(phoneRegex);
        if (phoneMatches && phoneMatches.length > 0) {
            riskScore += 50;
            flags.push(`Direct phone number detected: ${phoneMatches.join(', ')}`);
        }

        // 2. Telegram & Social Handle references
        const socialRegex = /(?:telegram|t\.me\/|@[\w_]{4,}|ቴሌግራም|whatsapp|ዋትስአፕ|viber)/gi;
        const socialMatches = text.match(socialRegex);
        if (socialMatches && socialMatches.length > 0) {
            riskScore += 40;
            flags.push(`Off-platform chat handle/link detected: ${socialMatches.join(', ')}`);
        }

        // 3. Poaching & off-platform solicitation keywords (English & Amharic)
        const solicitationRegex = /(?:call\s*me|ደውሉልኝ|ደውልልኝ|ደውይ|ስልኬ|contact\s*directly|inbox\s*me|direct\s*call|off\s*platform|outside\s*the\s*app)/gi;
        const solicitationMatches = text.match(solicitationRegex);
        if (solicitationMatches && solicitationMatches.length > 0) {
            riskScore += 30;
            flags.push('Solicitation for direct off-platform communication detected');
        }

        // 4. Circumventing escrow / Direct payment solicitation
        const paymentBypassRegex = /(?:cbe\s*direct|telebirr\s*to\s*my\s*(?:number|phone)|ወደ\s*አካውንቴ|direct\s*transfer|personal\s*account)/gi;
        const bypassMatches = text.match(paymentBypassRegex);
        if (bypassMatches && bypassMatches.length > 0) {
            riskScore += 60;
            flags.push('Solicitation to bypass TDW Escrow detected');
        }

        const normalizedScore = Math.min(riskScore, 100);
        return {
            isPoachingRisk: normalizedScore >= 40,
            riskScore: normalizedScore,
            flaggedPatterns: flags,
            recommendation: normalizedScore >= 70 ? 'BLOCK_OR_FLAG' : (normalizedScore >= 40 ? 'WARN' : 'ALLOW')
        };
    }

    /**
     * Checks for identity collision across multiple accounts.
     */
    async checkMultiAccountCollisions({ currentUserId, phone, faydaId, nationalIdUrl }) {
        const collisions = [];

        try {
            if (faydaId) {
                const faydaMatches = await prisma.jobSeeker.count({
                    where: { faydaId, id: { not: currentUserId } }
                });
                if (faydaMatches > 0) {
                    collisions.push(`Fayda ID shared with ${faydaMatches} other account(s)`);
                }
            }

            if (phone) {
                const seekerPhoneMatches = await prisma.jobSeeker.count({
                    where: { phone, id: { not: currentUserId } }
                });
                const employerPhoneMatches = await prisma.employer.count({
                    where: { phone, id: { not: currentUserId } }
                });
                const totalPhoneMatches = seekerPhoneMatches + employerPhoneMatches;
                if (totalPhoneMatches > 0) {
                    collisions.push(`Phone number registered under ${totalPhoneMatches} other account(s)`);
                }
            }

            if (nationalIdUrl) {
                const idMatches = await prisma.jobSeeker.count({
                    where: { nationalIdUrl, id: { not: currentUserId } }
                });
                if (idMatches > 0) {
                    collisions.push(`National ID document URL shared with ${idMatches} account(s)`);
                }
            }
        } catch (err) {
            console.error('[MultiAccount Collision Error]', err.message);
        }

        return collisions;
    }

    /**
     * Checks recent message velocity to detect automated spamming or poaching bots.
     * Uses polymorphic sender fields (senderJSId / senderEmpId).
     */
    async checkMessagingVelocity(userId) {
        try {
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
            const recentMessagesCount = await prisma.message.count({
                where: {
                    timestamp: { gte: fifteenMinutesAgo },
                    OR: [
                        { senderJSId: userId },
                        { senderEmpId: userId }
                    ]
                }
            });

            if (recentMessagesCount > 20) {
                return { isSpike: true, count: recentMessagesCount, risk: 40, flag: `Excessive messaging velocity: ${recentMessagesCount} messages in 15 mins` };
            }
            return { isSpike: false, count: recentMessagesCount, risk: 0, flag: null };
        } catch (err) {
            return { isSpike: false, count: 0, risk: 0, flag: null };
        }
    }

    /**
     * Comprehensive fraud risk evaluation for a given account.
     */
    async auditUserRisk(userId, userType = 'JOB_SEEKER') {
        try {
            let riskPoints = 0;
            const flags = [];

            if (userType === 'JOB_SEEKER') {
                const user = await prisma.jobSeeker.findUnique({
                    where: { id: userId },
                    include: { reportsReceived: true, disputes: true }
                });

                if (!user) return null;

                // 1. Identity & Multi-account collision
                const collisions = await this.checkMultiAccountCollisions({
                    currentUserId: userId,
                    phone: user.phone,
                    faydaId: user.faydaId,
                    nationalIdUrl: user.nationalIdUrl
                });
                if (collisions.length > 0) {
                    riskPoints += collisions.length * 25;
                    flags.push(...collisions);
                }

                // 2. Unverified Documents Check
                if (!user.isVerified && !user.nationalIdUrl) {
                    riskPoints += 15;
                    flags.push('Unverified account with missing primary National ID');
                }

                // 3. Reports received
                if (user.reportsReceived && user.reportsReceived.length > 0) {
                    const count = user.reportsReceived.length;
                    riskPoints += count * 20;
                    flags.push(`Received ${count} active safety report(s)`);
                }

                // 4. Disputes
                if (user.disputes && user.disputes.length > 0) {
                    const openDisputes = user.disputes.filter(d => d.status === 'OPEN').length;
                    if (openDisputes > 0) {
                        riskPoints += openDisputes * 25;
                        flags.push(`${openDisputes} open dispute(s) under review`);
                    }
                }

                // 5. Bio scanning for poaching
                if (user.bio) {
                    const poachingScan = this.scanTextForPoaching(user.bio);
                    if (poachingScan.isPoachingRisk) {
                        riskPoints += poachingScan.riskScore * 0.4;
                        flags.push(...poachingScan.flaggedPatterns.map(p => `Bio: ${p}`));
                    }
                }

                // 6. Messaging velocity
                const velocity = await this.checkMessagingVelocity(userId);
                if (velocity.isSpike) {
                    riskPoints += velocity.risk;
                    flags.push(velocity.flag);
                }

                const totalRisk = Math.min(Math.round(riskPoints), 100);
                const riskLevel = totalRisk >= 70 ? 'HIGH' : totalRisk >= 35 ? 'MEDIUM' : 'LOW';
                const recommendation = totalRisk >= 75 ? 'SUSPEND' : totalRisk >= 45 ? 'WARN_ADMIN' : 'ALLOW';

                return {
                    userId,
                    userType,
                    fullName: user.fullName,
                    phone: user.phone,
                    riskScore: totalRisk,
                    riskLevel,
                    flags,
                    recommendation,
                    isSuspended: !user.isActive
                };

            } else {
                const user = await prisma.employer.findUnique({
                    where: { id: userId },
                    include: { reportsReceived: true, jobPosts: true }
                });

                if (!user) return null;

                if (user.reportsReceived && user.reportsReceived.length > 0) {
                    const count = user.reportsReceived.length;
                    riskPoints += count * 25;
                    flags.push(`Received ${count} safety violation report(s)`);
                }

                const velocity = await this.checkMessagingVelocity(userId);
                if (velocity.isSpike) {
                    riskPoints += velocity.risk;
                    flags.push(velocity.flag);
                }

                const totalRisk = Math.min(Math.round(riskPoints), 100);
                const riskLevel = totalRisk >= 70 ? 'HIGH' : totalRisk >= 35 ? 'MEDIUM' : 'LOW';
                const recommendation = totalRisk >= 75 ? 'SUSPEND' : totalRisk >= 45 ? 'WARN_ADMIN' : 'ALLOW';

                return {
                    userId,
                    userType,
                    contactName: user.contactName,
                    phone: user.phone,
                    riskScore: totalRisk,
                    riskLevel,
                    flags,
                    recommendation,
                    isSuspended: !user.isActive
                };
            }
        } catch (error) {
            console.error('[Fraud Detection Error]', error);
            return null;
        }
    }

    /**
     * Scans system for top high-risk accounts requiring admin review.
     */
    async getHighRiskAccountsSummary() {
        try {
            const seekers = await prisma.jobSeeker.findMany({
                where: { isActive: true },
                take: 30,
                select: { id: true, fullName: true, phone: true, isVerified: true, faydaId: true }
            });

            const auditedList = [];
            for (const s of seekers) {
                const audit = await this.auditUserRisk(s.id, 'JOB_SEEKER');
                if (audit && audit.riskScore >= 35) {
                    auditedList.push(audit);
                }
            }

            auditedList.sort((a, b) => b.riskScore - a.riskScore);
            return auditedList;
        } catch (err) {
            console.error('[Fraud Summary Error]', err);
            return [];
        }
    }
}

module.exports = new FraudDetectionService();

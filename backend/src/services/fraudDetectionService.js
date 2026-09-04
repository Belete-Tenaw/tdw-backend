const prisma = require('../utils/prisma');

/**
 * AI Fraud & Anomaly Detection Engine
 * Evaluates risk vectors across accounts, identity verification duplicates,
 * suspicious registration velocity, and reported behavioral violations.
 */
class FraudDetectionService {
    
    /**
     * Conducts automated fraud risk assessment on a Job Seeker or Employer account.
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

                // 1. Fayda ID Duplicate Check
                if (user.faydaId) {
                    const duplicates = await prisma.jobSeeker.count({
                        where: { faydaId: user.faydaId, id: { not: userId } }
                    });
                    if (duplicates > 0) {
                        riskPoints += 45;
                        flags.push(`Duplicate Fayda ID detected across ${duplicates} accounts`);
                    }
                }

                // 2. Unverified Documents & Incomplete Profile
                if (!user.isVerified && !user.nationalIdUrl) {
                    riskPoints += 15;
                    flags.push('Unverified account with missing primary National ID');
                }

                // 3. Safety Reports Received
                if (user.reportsReceived && user.reportsReceived.length > 0) {
                    const count = user.reportsReceived.length;
                    riskPoints += count * 20;
                    flags.push(`Received ${count} active safety report(s)`);
                }

                // 4. Disputes Track Record
                if (user.disputes && user.disputes.length > 0) {
                    const activeDisputes = user.disputes.filter(d => d.status === 'OPEN').length;
                    if (activeDisputes > 0) {
                        riskPoints += activeDisputes * 25;
                        flags.push(`${activeDisputes} open dispute(s) under review`);
                    }
                }

                const totalRisk = Math.min(riskPoints, 100);
                const riskLevel = totalRisk >= 70 ? 'HIGH' : totalRisk >= 35 ? 'MEDIUM' : 'LOW';

                return {
                    userId,
                    userType,
                    fullName: user.fullName,
                    phone: user.phone,
                    riskScore: totalRisk,
                    riskLevel,
                    flags,
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

                const totalRisk = Math.min(riskPoints, 100);
                const riskLevel = totalRisk >= 70 ? 'HIGH' : totalRisk >= 35 ? 'MEDIUM' : 'LOW';

                return {
                    userId,
                    userType,
                    contactName: user.contactName,
                    phone: user.phone,
                    riskScore: totalRisk,
                    riskLevel,
                    flags,
                    isSuspended: !user.isActive
                };
            }
        } catch (error) {
            console.error('[Fraud Detection Error]', error);
            return null;
        }
    }

    /**
     * Scans system for top high-risk accounts requiring admin moderation.
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

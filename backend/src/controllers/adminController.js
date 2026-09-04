const prisma = require('../utils/prisma');
const crypto = require('crypto');
const { logAction } = require('../services/auditService');
const { sendSMSAlert } = require('../services/notificationService');
const { auth } = require('../utils/firebaseAdmin');
const telegramService = require('../services/telegramService');

exports.grantSuperAdminRole = async (req, res) => {
    try {
        const { uid } = req.body;
        if (!uid) {
            return res.status(400).json({ error: 'UID is required' });
        }

        // Use Firebase Admin SDK to set the custom claim
        await auth.setCustomUserClaims(uid, { superAdmin: true });

        // Log this critical action
        await logAction(
            'ADMIN_GRANT_SUPERADMIN',
            req.user.id,
            'ADMIN',
            { targetUserId: uid }
        );

        res.status(200).json({ message: `Success! ${uid} is now a Super Admin.` });
    } catch (error) {
        console.error('Error granting superAdmin role:', error);
        res.status(500).json({ error: 'Failed to assign Super Admin claim.' });
    }
};


exports.getAllUsers = async (req, res) => {
    try {
        const seekers = await prisma.jobSeeker.findMany({
            select: {
                id: true, fullName: true, phone: true, email: true,
                isVerified: true, verificationStatus: true, tier: true, badge: true, createdAt: true,
                profilePhoto: true, idDocument: true, isActive: true,
                nationalIdUrl: true, policeClearanceUrl: true, healthCertificateUrl: true,
                guarantorIdUrl: true, guarantorPhone: true,
                verificationRequests: {
                    where: { status: 'PENDING' },
                    orderBy: { submittedAt: 'desc' },
                    take: 1
                }
            }
        });
        const employers = await prisma.employer.findMany({
            select: {
                id: true, contactName: true, phone: true, email: true,
                isVerified: true, verificationStatus: true, tier: true, badge: true, createdAt: true,
                profilePhoto: true, idDocument: true, isActive: true,
                verificationRequests: {
                    where: { status: 'PENDING' },
                    orderBy: { submittedAt: 'desc' },
                    take: 1
                }
            }
        });
        res.json({ seekers, employers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getPendingVerifications = async (req, res) => {
    try {
        const { getSignedUrlForFile } = require('../services/firebaseStorageService');

        const pendingRequests = await prisma.verificationRequest.findMany({
            where: { status: 'PENDING' },
            include: {
                jobSeeker: {
                    select: {
                        id: true,
                        fullName: true,
                        tier: true,
                        phone: true,
                        idDocument: true,
                        nationalIdUrl: true,
                        policeClearanceUrl: true,
                        healthCertificateUrl: true,
                        guarantorIdUrl: true
                    }
                },
                employer: {
                    select: {
                        id: true,
                        contactName: true,
                        tier: true,
                        phone: true,
                        idDocument: true
                    }
                }
            },
            orderBy: { submittedAt: 'asc' }
        });

        // Enrich with short-lived Signed URLs (10 minutes) for Admin viewing
        const enrichedRequests = await Promise.all(pendingRequests.map(async (req) => {
            const enrichedReq = { ...req };
            const user = req.jobSeeker || req.employer;

            if (user) {
                // Generate secure Signed URLs for private documents
                if (user.idDocument) user.idDocumentUrl = await getSignedUrlForFile(user.idDocument, 10);
                if (user.nationalIdUrl) user.nationalIdUrl_signed = await getSignedUrlForFile(user.nationalIdUrl, 10);
                if (user.policeClearanceUrl) user.policeClearanceUrl_signed = await getSignedUrlForFile(user.policeClearanceUrl, 10);
                if (user.healthCertificateUrl) user.healthCertificateUrl_signed = await getSignedUrlForFile(user.healthCertificateUrl, 10);
                if (user.guarantorIdUrl) user.guarantorIdUrl_signed = await getSignedUrlForFile(user.guarantorIdUrl, 10);
            }
            return enrichedReq;
        }));

        res.json(enrichedRequests);
    } catch (error) {
        console.error('Error fetching pending verifications:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.verifyUser = async (req, res) => {
    try {
        const { requestId, status, tier, reason } = req.body; 
        const { processVerificationRequest } = require('../services/verificationService');

        if (!requestId || !status) {
            return res.status(400).json({ error: 'Missing required fields (requestId, status)' });
        }

        const result = await processVerificationRequest(
            req.user.id,
            requestId,
            status,
            tier,
            reason
        );

        // Telegram Notification for Seeker Rank Upgrades (Keep this part in controller)
        if (result.targetType === 'SEEKER' && status === 'APPROVED') {
            const updated = await prisma.jobSeeker.findUnique({ where: { id: result.targetUserId }, select: { badge: true, telegramChatId: true }});
            if (updated && updated.telegramChatId) {
                const badgeName = updated.badge || 'STANDARD';
                const message = `🎉 <b>Congratulation!</b>\n\nYour <b>${badgeName}</b> verification has been approved! Your profile is now more visible to employers.\n\nመልካም ዜና! የእርስዎ <b>${badgeName}</b> ማዕረግ ጸድቋል። አሁን ፕሮፋይልዎ ለአሰሪዎች በበለጠ ይታያል!`;
                await telegramService.sendMessage(updated.telegramChatId, message);
            }
        }

        res.json({ message: `Verification request ${status} successfully.`, result });
    } catch (error) {
        console.error("verifyUser Admin Error:", error);
        res.status(400).json({ error: error.message });
    }
};

/**
 * directVerifyUser - handles the Admin Dashboard's direct verify call.
 * Called via POST /admin/verify with body: { id, type, status, badge }
 * This is a simplified approval that directly updates the user record
 * without requiring a pending VerificationRequest.
 */
exports.directVerifyUser = async (req, res) => {
    try {
        const { id, type, status, badge } = req.body;

        if (!id || !type || !status) {
            return res.status(400).json({ error: 'Missing required fields (id, type, status)' });
        }

        const normalizedStatus = status.toUpperCase(); // APPROVED | REJECTED | PENDING
        const normalizedType = type.toLowerCase(); // seeker | employer

        if (!['APPROVED', 'REJECTED', 'PENDING'].includes(normalizedStatus)) {
            return res.status(400).json({ error: 'Invalid status. Must be APPROVED, REJECTED, or PENDING.' });
        }

        if (normalizedType === 'seeker') {
            const updateData = { verificationStatus: normalizedStatus };
            if (normalizedStatus === 'APPROVED' && badge) {
                updateData.badge = badge;
                updateData.isVerified = true;
                // Map badge to tier
                const tierMap = { SILVER: 'SILVER', GOLD: 'GOLD', PLATINUM: 'PLATINUM' };
                if (tierMap[badge]) updateData.tier = tierMap[badge];
            } else if (normalizedStatus === 'REJECTED') {
                updateData.isVerified = false;
            }
            await prisma.jobSeeker.update({ where: { id }, data: updateData });

            // Telegram notification on approval
            if (normalizedStatus === 'APPROVED') {
                const updated = await prisma.jobSeeker.findUnique({ where: { id }, select: { badge: true, telegramChatId: true, fullName: true } });
                if (updated && updated.telegramChatId) {
                    const badgeName = updated.badge || 'STANDARD';
                    const message = `🎉 <b>Congratulations ${updated.fullName}!</b>\n\nYour <b>${badgeName}</b> verification has been approved! Your profile is now visible to employers.\n\nመልካም ዜና! የእርስዎ <b>${badgeName}</b> ማዕረግ ጸድቋል።`;
                    await telegramService.sendMessage(updated.telegramChatId, message);
                }
            }
        } else if (normalizedType === 'employer') {
            const updateData = { verificationStatus: normalizedStatus };
            if (normalizedStatus === 'APPROVED') {
                updateData.isVerified = true;
                updateData.badge = 'VERIFIED';
            } else if (normalizedStatus === 'REJECTED') {
                updateData.isVerified = false;
            }
            await prisma.employer.update({ where: { id }, data: updateData });
        } else {
            return res.status(400).json({ error: 'Invalid type. Must be seeker or employer.' });
        }

        // Audit log
        await logAction(
            `ADMIN_DIRECT_VERIFY_${normalizedStatus}`,
            req.user.id,
            'ADMIN',
            { targetUserId: id, targetUserType: type, status: normalizedStatus, badge }
        );

        res.json({ message: `User ${normalizedStatus.toLowerCase()} successfully.` });
    } catch (error) {
        console.error('directVerifyUser Error:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.updateAccountStatus = async (req, res) => {
    try {
        const { id, type, action } = req.body; // action: SUSPEND, ACTIVATE

        // In this schema, we don't have a specific 'accountStatus' field yet, 
        // but we can use verificationStatus: REJECTED or a new field.
        // For now, let's just log and update verificationStatus as a placeholder or 
        // assume we might add an isActive field later.

        // Since we are strictly following the provided schema, let's use verificationStatus for now
        // or just log the action if we were to add a field.

        await logAction(
            'ADMIN_ACCOUNT_STATUS_CHANGE',
            req.user.id,
            'ADMIN',
            { targetUserId: id, targetUserType: type, action }
        );

        if (type === 'seeker') {
            await prisma.jobSeeker.update({
                where: { id },
                data: {
                    isActive: action === 'ACTIVATE'
                }
            });
        } else {
            await prisma.employer.update({
                where: { id },
                data: {
                    isActive: action === 'ACTIVATE'
                }
            });
        }

        res.json({ message: `User account ${action}ed` });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.generateCode = async (req, res) => {
    try {
        const { days } = req.body;
        const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 char code

        // expiry of the code itself
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Code expires in 7 days if not used

        const newCode = await prisma.subscriptionCode.create({
            data: {
                code,
                expiresAt,
                durationDays: days ? parseInt(days) : 30
            }
        });

        // Audit Log
        await logAction(
            'ADMIN_CODE_GENERATED',
            req.user.id,
            'ADMIN',
            { code: newCode.code, durationDays: newCode.durationDays }
        );

        res.status(201).json(newCode);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.activatePremiumCode = async (req, res) => {
    try {
        const { code, userId, targetType, days } = req.body;

        const subCode = await prisma.subscriptionCode.findUnique({
            where: { code }
        });

        if (!subCode || subCode.status === 'USED' || subCode.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Invalid or expired code' });
        }

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(days));

        if (targetType === 'JOB_SEEKER') {
            await prisma.jobSeeker.update({
                where: { id: userId },
                data: { tier: 'SILVER', subscriptionExpiry: expiryDate, premiumCode: code, isSubscribed: true }
            });
        } else {
            await prisma.employer.update({
                where: { id: userId },
                data: { tier: 'SILVER_ACCESS', subscriptionExpiry: expiryDate, premiumCode: code, isSubscribed: true }
            });
        }

        await prisma.subscriptionCode.update({
            where: { code },
            data: { status: 'USED', assignedTo: userId, userType: targetType }
        });

        // Audit Log
        await logAction(
            'ADMIN_MANUAL_ACTIVATE',
            req.user.id,
            'ADMIN',
            { targetUserId: userId, targetUserType: targetType, code, days }
        );

        // SMS Alert for Premium Activation
        if (targetType === 'JOB_SEEKER') {
            const seeker = await prisma.jobSeeker.findUnique({ where: { id: userId }, select: { phone: true } });
            if (seeker && seeker.phone) {
                sendSMSAlert(seeker.phone, `🎉 Your Premium Access has been activated! Valid for ${days} days. Thank you for using EDWL.`);
            }
        } else {
            const employer = await prisma.employer.findUnique({ where: { id: userId }, select: { phone: true } });
            if (employer && employer.phone) {
                sendSMSAlert(employer.phone, `🎉 Your Premium Access has been activated! Valid for ${days} days. Thank you for using EDWL.`);
            }
        }

        res.json({ message: 'Premium Access activated successfully', expiryDate, isSubscribed: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id, type } = req.params;

        // Only SUPERADMIN can delete users — MODERATORs can only suspend
        if (req.user.adminRole !== 'SUPERADMIN') {
            return res.status(403).json({ error: 'Only SUPERADMIN can delete users. Use Account Suspension instead.' });
        }

        if (type === 'seeker') {
            await prisma.jobSeeker.delete({ where: { id } });
        } else {
            await prisma.employer.delete({ where: { id } });
        }

        // Audit Log
        await logAction(
            'ADMIN_USER_DELETED',
            req.user.id,
            'ADMIN',
            { deletedUserId: id, deletedUserType: type }
        );

        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.getAdminStats = async (req, res) => {
    try {
        const [
            totalSeekers,
            approvedSeekers,
            totalEmployers,
            premiumEmployers,
            totalJobs,
            completedVerifications,
            demandGroups,
            supplyGroups
        ] = await Promise.all([
            prisma.jobSeeker.count(),
            prisma.jobSeeker.count({ where: { verificationStatus: 'APPROVED' } }),
            prisma.employer.count(),
            prisma.employer.count({ where: { tier: { not: 'FREE' } } }),
            prisma.jobPost.count(),
            prisma.verificationRequest.findMany({
                where: { status: 'APPROVED' },
                select: { submittedAt: true, reviewedAt: true }
            }),
            prisma.jobPost.groupBy({
                by: ['locationWoreda'],
                _count: { id: true },
                where: { locationWoreda: { not: null } }
            }),
            prisma.jobSeeker.groupBy({
                by: ['locationWoreda'],
                _count: { id: true },
                where: { verificationStatus: 'APPROVED', locationWoreda: { not: null } }
            })
        ]);

        // Calculate Heatmap (Demand vs Supply)
        const heatmap = demandGroups.map(d => {
            const supply = supplyGroups.find(s => s.locationWoreda === d.locationWoreda);
            return {
                woreda: d.locationWoreda,
                demand: d._count.id,
                supply: supply ? supply._count.id : 0,
                shortage: d._count.id - (supply ? supply._count.id : 0)
            };
        }).sort((a, b) => b.shortage - a.shortage);

        // Calculate Verification Velocity (Average hours)
        let avgVelocityHours = 0;
        if (completedVerifications.length > 0) {
            const totalDuration = completedVerifications.reduce((acc, curr) => {
                if (curr.reviewedAt && curr.submittedAt) {
                    return acc + (new Date(curr.reviewedAt) - new Date(curr.submittedAt));
                }
                return acc;
            }, 0);
            avgVelocityHours = (totalDuration / completedVerifications.length) / (1000 * 60 * 60);
        }

        // Liquidity Ratio (Jobs per Approved Seeker)
        const liquidityRatio = approvedSeekers > 0 ? (totalJobs / approvedSeekers).toFixed(2) : 0;

        // Conversion Rate (Premium Employers %)
        const conversionRate = totalEmployers > 0 ? ((premiumEmployers / totalEmployers) * 100).toFixed(1) : 0;

        // Revenue Breakdown
        const [automatedRevenueData, manualRevenueData] = await Promise.all([
            prisma.payment.aggregate({
                where: { status: 'COMPLETED', provider: { in: ['CHAPA', 'TELEBIRR'] } },
                _sum: { amount: true }
            }),
            prisma.payment.aggregate({
                where: { status: 'COMPLETED', provider: { in: ['MANUAL', 'CBE'] } },
                _sum: { amount: true }
            })
        ]);

        // LTV Marketing (Comeback Codes) Stats
        const [totalPromoSent, promoUsed] = await Promise.all([
            prisma.subscriptionCode.count({
                where: { code: { startsWith: 'COMEBACK-' } }
            }),
            prisma.subscriptionCode.count({
                where: { code: { startsWith: 'COMEBACK-' }, status: 'USED' }
            })
        ]);

        res.json({
            metrics: {
                verificationVelocity: avgVelocityHours.toFixed(1), // in hours
                liquidityRatio,
                conversionRate,
                seedingProgress: approvedSeekers, // Target is 50
                targetSeeding: 50,
                heatmap: heatmap.slice(0, 5), // Top 5 shortages
                revenue: {
                    automated: automatedRevenueData._sum.amount || 0,
                    manual: manualRevenueData._sum.amount || 0,
                    total: (automatedRevenueData._sum.amount || 0) + (manualRevenueData._sum.amount || 0)
                },
                marketingStats: {
                    promoCodesSent: totalPromoSent,
                    promoCodesUsed: promoUsed,
                    conversionRate: totalPromoSent > 0 ? ((promoUsed / totalPromoSent) * 100).toFixed(1) : 0
                }
            },
            counts: {
                seekers: totalSeekers,
                approvedSeekers,
                employers: totalEmployers,
                premiumEmployers,
                jobs: totalJobs
            }
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
};

/**
 * 🛡️ Fraud Audit Report Endpoint
 */
exports.getFraudAuditReport = async (req, res) => {
    try {
        const fraudService = require('../services/fraudDetectionService');
        const summary = await fraudService.getHighRiskAccountsSummary();
        res.json({
            status: 'success',
            highRiskCount: summary.length,
            accounts: summary
        });
    } catch (error) {
        console.error('[Admin Fraud Audit Error]', error);
        res.status(500).json({ error: 'Failed to generate fraud audit report' });
    }
};

/**
 * 🛡️ Detailed Single User Anomaly Audit
 */
exports.getSingleUserFraudAudit = async (req, res) => {
    try {
        const { userId } = req.params;
        const { type } = req.query; // JOB_SEEKER or EMPLOYER
        const fraudService = require('../services/fraudDetectionService');
        const audit = await fraudService.auditUserRisk(userId, type || 'JOB_SEEKER');
        if (!audit) {
            return res.status(404).json({ error: 'User not found or audit failed' });
        }
        res.json({ status: 'success', audit });
    } catch (error) {
        console.error('[Single User Fraud Audit Error]', error);
        res.status(500).json({ error: 'Failed to audit user' });
    }
};



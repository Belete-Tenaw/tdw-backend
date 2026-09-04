const crypto = require('crypto');
const prisma = require('../utils/prisma');

class GuarantorService {
    async createVerificationRequest(seekerId, { guarantorName, guarantorPhone, guarantorRelationship }) {
        if (!guarantorName || !guarantorPhone) {
            throw new Error('Guarantor name and valid phone number are required.');
        }
        const seeker = await prisma.jobSeeker.findUnique({ where: { id: seekerId } });
        if (!seeker) throw new Error('Job Seeker profile not found');
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const token = crypto.randomBytes(24).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await prisma.jobSeeker.update({
            where: { id: seekerId },
            data: {
                guarantorName,
                guarantorPhone,
                guarantorRelationship: guarantorRelationship || 'Family / Relative',
                guarantorToken: token,
                guarantorOtp: otpCode,
                guarantorOtpExpires: expiresAt,
                isGuarantorVerified: false
            }
        });
        const baseUrl = process.env.CLIENT_URL || process.env.BASE_URL || 'http://localhost:5173';
        const consentUrl = baseUrl + '/guarantor-consent?token=' + token;
        return {
            status: 'PENDING_GUARANTOR_CONSENT',
            message: 'Guarantor verification invite generated successfully.',
            guarantorName,
            guarantorPhone,
            consentUrl,
            otpCode,
            expiresAt
        };
    }

    async getPublicConsentDetails(token) {
        if (!token) throw new Error('Invalid verification link.');
        const seeker = await prisma.jobSeeker.findFirst({
            where: { guarantorToken: token },
            select: {
                id: true,
                fullName: true,
                profilePhoto: true,
                locationRegion: true,
                locationZone: true,
                guarantorName: true,
                guarantorPhone: true,
                guarantorRelationship: true,
                isGuarantorVerified: true,
                guarantorOtpExpires: true
            }
        });
        if (!seeker) throw new Error('Verification link not found or has expired.');
        const isExpired = seeker.guarantorOtpExpires && new Date() > new Date(seeker.guarantorOtpExpires);
        if (isExpired) {
            return { status: 'EXPIRED', message: 'This verification link has expired.' };
        }
        return {
            status: seeker.isGuarantorVerified ? 'ALREADY_VERIFIED' : 'READY_FOR_CONSENT',
            seeker: {
                id: seeker.id,
                fullName: seeker.fullName,
                profilePhoto: seeker.profilePhoto,
                location: seeker.locationRegion || 'Addis Ababa',
                guarantorName: seeker.guarantorName,
                guarantorPhone: seeker.guarantorPhone,
                guarantorRelationship: seeker.guarantorRelationship
            }
        };
    }

    async verifyGuarantorConsent(token, otpCode, signatureData = {}) {
        if (!token || !otpCode) throw new Error('Token and OTP code are required.');
        const seeker = await prisma.jobSeeker.findFirst({ where: { guarantorToken: token } });
        if (!seeker) throw new Error('Guarantor verification session not found.');
        if (seeker.guarantorOtp !== otpCode.trim()) {
            throw new Error('Invalid OTP code. Please check the 6-digit code received.');
        }
        if (seeker.guarantorOtpExpires && new Date() > new Date(seeker.guarantorOtpExpires)) {
            throw new Error('Verification session has expired. Please request a new invite.');
        }
        const certPayload = seeker.id + '-' + seeker.guarantorPhone + '-' + Date.now() + '-' + (signatureData.ipAddress || 'WEB');
        const consentCertificateHash = crypto.createHash('sha256').update(certPayload).digest('hex');
        const updatedPoints = (seeker.rewardPoints || 0) + 25;
        const updatedBehaviorScore = Math.min((seeker.behaviorScore || 50) + 10, 100);
        await prisma.jobSeeker.update({
            where: { id: seeker.id },
            data: {
                isGuarantorVerified: true,
                guarantorVerifiedAt: new Date(),
                rewardPoints: updatedPoints,
                behaviorScore: updatedBehaviorScore,
                guarantorOtp: null
            }
        });
        await prisma.auditLog.create({
            data: {
                jobSeekerId: seeker.id,
                action: 'GUARANTOR_CONSENT_VERIFIED',
                details: {
                    guarantorName: seeker.guarantorName,
                    guarantorPhone: seeker.guarantorPhone,
                    relationship: seeker.guarantorRelationship,
                    certificateHash: consentCertificateHash,
                    pointsAwarded: 25,
                    timestamp: new Date()
                }
            }
        });
        return {
            status: 'VERIFIED',
            message: 'Guarantor legal consent verified successfully! +25 Trust points awarded.',
            certificateHash: consentCertificateHash,
            workerName: seeker.fullName
        };
    }

    async getGuarantorStatus(seekerId) {
        const seeker = await prisma.jobSeeker.findUnique({
            where: { id: seekerId },
            select: {
                guarantorName: true,
                guarantorPhone: true,
                guarantorRelationship: true,
                isGuarantorVerified: true,
                guarantorVerifiedAt: true,
                guarantorToken: true,
                guarantorOtpExpires: true
            }
        });
        if (!seeker) throw new Error('Worker not found');
        let status = 'NONE';
        if (seeker.isGuarantorVerified) {
            status = 'VERIFIED';
        } else if (seeker.guarantorToken) {
            const isExpired = seeker.guarantorOtpExpires && new Date() > new Date(seeker.guarantorOtpExpires);
            status = isExpired ? 'EXPIRED' : 'PENDING';
        }
        return {
            status,
            guarantorName: seeker.guarantorName,
            guarantorPhone: seeker.guarantorPhone,
            relationship: seeker.guarantorRelationship,
            verifiedAt: seeker.guarantorVerifiedAt,
            token: seeker.guarantorToken
        };
    }
}

module.exports = new GuarantorService();

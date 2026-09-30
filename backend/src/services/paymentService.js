const prisma = require('../utils/prisma');
const { logAction } = require('./auditService');
const chapaService = require('./chapaService');
const telegramService = require('./telegramService');

class PaymentService {
    /**
     * Get all available subscription tiers
     */
    async getTiers() {
        return await prisma.subscriptionTier.findMany({
            orderBy: { priceETB: 'asc' }
        });
    }

    /**
     * Get simulated payment URL for providers
     */
    getPaymentURL(provider, amount, transactionReference) {
        if (provider === 'TELEBIRR') {
            // Simulate Telebirr H5/Web-pay URL
            return `https://telebirr.et/pay?appId=edwl_app&amount=${amount}&ref=${transactionReference}&callback=https://edwl.et/api/payments/complete`;
        }
        if (provider === 'CBE') {
            // Simulate CBE Birr USSD/Link
            return `https://cbebirr.et/ussd/pay?shortcode=123456&amount=${amount}&ref=${transactionReference}`;
        }
        return `https://edwl.et/manual-payment?ref=${transactionReference}`;
    }

    /**
     * Initialize a payment for a subscription
     * @param {string} userId - ID of the jobseeker or employer
     * @param {string} userType - 'seeker' or 'employer'
     * @param {string} tierId - ID of the subscription tier
     * @param {string} provider - Payment provider (TELEBIRR, CHAPA, etc.)
     */
    async initiatePayment(userId, userType, tierId, provider) {
        const tier = await prisma.subscriptionTier.findUnique({ where: { id: tierId } });
        if (!tier) throw new Error('Subscription tier not found');

        const transactionReference = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Fetch user info for Chapa
        let user;
        if (userType === 'seeker') {
            user = await prisma.jobSeeker.findUnique({ where: { id: userId } });
        } else {
            user = await prisma.employer.findUnique({ where: { id: userId } });
        }

        if (!user) {
            throw new Error('User account not found');
        }

        const payment = await prisma.payment.create({
            data: {
                amount: tier.priceETB,
                provider,
                transactionReference,
                status: 'PENDING',
                tierId,
                [userType === 'seeker' ? 'jobSeekerId' : 'employerId']: userId
            }
        });

        // If using CHAPA (which handles Telebirr/CBE too) or STRIPE
        if (provider === 'CHAPA' || provider === 'TELEBIRR' || provider === 'STRIPE') {
            const checkoutData = {
                amount: tier.priceETB.toString(),
                currency: 'ETB',
                email: user.email || 'customer@edwl.et',
                first_name: (user.fullName || user.contactName || 'Customer').split(' ')[0],
                last_name: (user.fullName || user.contactName || 'Customer').split(' ')[1] || 'User',
                tx_ref: transactionReference,
                callback_url: `${process.env.BASE_URL}/api/payments/complete`,
                return_url: `${process.env.FRONTEND_URL || 'https://edwl.et'}/payment-success?ref=${transactionReference}`,
                customization: {
                    title: `EDWL ${tier.tier} Subscription`,
                    description: `Subscription for ${tier.durationDays} days`
                }
            };

            let res;
            if (provider === 'STRIPE') {
                const stripeService = require('./stripeService');
                res = await stripeService.initialize(checkoutData);
            } else {
                res = await chapaService.initialize(checkoutData);
            }

            if (res.status === 'success') {
                return {
                    ...payment,
                    paymentUrl: res.data.checkout_url
                };
            }
        }

        // Fallback or other providers
        return {
            ...payment,
            paymentUrl: this.getPaymentURL(provider, tier.priceETB, transactionReference)
        };
    }

    /**
     * Verify and complete a payment, then activate subscription
     * @param {string} paymentId 
     * @param {string} externalRef - External reference from provider
     */
    async completePayment(paymentId, externalRef) {
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: { jobSeeker: true, employer: true }
        });

        if (!payment) throw new Error('Payment not found');
        if (payment.status === 'COMPLETED') return payment;

        // Verify with Provider
        if (payment.provider === 'CHAPA' || payment.provider === 'TELEBIRR') {
            const verification = await chapaService.verify(payment.transactionReference);
            if (verification.status !== 'success') {
                throw new Error('Payment verification failed with Chapa/Telebirr');
            }
        } else if (payment.provider === 'STRIPE') {
            const stripeService = require('./stripeService');
            const verification = await stripeService.verify(payment.transactionReference);
            if (verification.status !== 'success' && verification.status !== 'paid') {
                throw new Error('Payment verification failed with Stripe');
            }
            if (verification.data && verification.data.external_ref) {
                externalRef = verification.data.external_ref;
            }
        }

        return await prisma.$transaction(async (tx) => {
            // 1. Update Payment Status
            const updatedPayment = await tx.payment.update({
                where: { id: paymentId },
                data: {
                    status: 'COMPLETED',
                    transactionReference: externalRef || payment.transactionReference
                }
            });

            // 2. Find Tier
            const tier = await tx.subscriptionTier.findUnique({ where: { id: payment.tierId } });
            if (!tier) throw new Error('Tier not found for this payment');

            // 3. Create/Update Subscription
            const durationMs = (tier.durationDays || 30) * 24 * 60 * 60 * 1000;
            const expiryDate = new Date(Date.now() + durationMs);

            const subscription = await tx.subscription.create({
                data: {
                    [payment.jobSeekerId ? 'jobSeekerId' : 'employerId']: payment.jobSeekerId || payment.employerId,
                    tierId: tier.id,
                    endDate: expiryDate,
                    status: 'ACTIVE',
                    paymentId: paymentId
                }
            });

            // 4. Update User Tier
            const userName = payment.jobSeeker?.fullName || payment.employer?.contactName || 'User';
            if (payment.jobSeekerId) {
                await tx.jobSeeker.update({
                    where: { id: payment.jobSeekerId },
                    data: { tier: tier.tier, subscriptionExpiry: expiryDate, isSubscribed: true }
                });
            } else {
                await tx.employer.update({
                    where: { id: payment.employerId },
                    data: { tier: tier.tier, subscriptionExpiry: expiryDate, isSubscribed: true }
                });
            }

            // 5. Generate Invoice
            await tx.invoice.create({
                data: {
                    invoiceNumber: `INV-${Date.now()}`,
                    paymentId: paymentId
                }
            });

            // 6. Audit Log
            await logAction(
                'PAYMENT_COMPLETED',
                payment.jobSeekerId || payment.employerId,
                payment.jobSeekerId ? 'JOB_SEEKER' : 'EMPLOYER',
                { paymentId, tierId: tier.id, provider: payment.provider }
            );

            // 7. Telegram Revenue Alert for Admin
            const adminNotifyText = `💹 <b>New Subscription!</b>\n\nUser: <b>${userName}</b>\nTier: <b>${tier.tier}</b>\nAmount: <b>${tier.priceETB} ETB</b>\nProvider: <b>${payment.provider}</b>\nRef: <code>${payment.transactionReference}</code>`;
            await telegramService.notifyAdmin(adminNotifyText);

            return updatedPayment;
        });
    }

    /**
     * Activate a subscription using a code
     */
    async activateWithCode(userId, userType, code) {
        return await prisma.$transaction(async (tx) => {
            const subCode = await tx.subscriptionCode.findUnique({
                where: { code }
            });

            if (!subCode || subCode.status !== 'UNUSED') {
                throw new Error('Invalid or used activation code');
            }

            if (subCode.expiresAt < new Date()) {
                throw new Error('Code has expired');
            }
            // Update code status
            await tx.subscriptionCode.update({
                where: { code },
                data: { status: 'USED', assignedTo: userId, userType }
            });

            // Update user tier and expiry
            // Robust 30-day calculation (or subCode.durationDays) using UTC
            const durationMs = (subCode.durationDays || 30) * 24 * 60 * 60 * 1000;
            const expiryDate = new Date(Date.now() + durationMs);

            // Determine the tier to apply
            // If code has a tierUpgrade, use it. Otherwise default to SILVER (legacy support)
            const tierToApply = subCode.tierUpgrade || 'SILVER';

            let updatedUser;
            if (userType === 'seeker') {
                updatedUser = await tx.jobSeeker.update({
                    where: { id: userId },
                    data: { 
                        tier: tierToApply === 'SILVER_ACCESS' ? 'SILVER' : 
                              tierToApply === 'GOLD_ACCESS' ? 'GOLD' : 
                              tierToApply === 'PLATINUM_ACCESS' ? 'PLATINUM' : 'SILVER', 
                        subscriptionExpiry: expiryDate,
                        isSubscribed: true,
                        premiumCode: code
                    }
                });
            } else {
                updatedUser = await tx.employer.update({
                    where: { id: userId },
                    data: { 
                        tier: tierToApply, 
                        subscriptionExpiry: expiryDate,
                        isSubscribed: true,
                        premiumCode: code
                    }
                });
            }

            // Audit Log
            await logAction(
                'SUBSCRIPTION_CODE_REDEEMED',
                userId,
                userType === 'seeker' ? 'JOB_SEEKER' : 'EMPLOYER',
                { code, durationDays: subCode.durationDays }
            );

            return updatedUser;
        });
    }

    /**
     * Validate a code (check if exists, unused, and not expired)
     */
    async validateCode(code) {
        const subCode = await prisma.subscriptionCode.findUnique({
            where: { code }
        });

        if (!subCode) {
            return { valid: false, message: 'Invalid code' };
        }

        if (subCode.status !== 'UNUSED') {
            return { valid: false, message: 'Code already used' };
        }

        if (subCode.expiresAt < new Date()) {
            return { valid: false, message: 'Code has expired' };
        }

        return { 
            valid: true, 
            message: 'Code is valid',
            durationDays: subCode.durationDays,
            tierUpgrade: subCode.tierUpgrade
        };
    }
}

module.exports = new PaymentService();

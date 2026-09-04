const prisma = require('../utils/prisma');

/**
 * Domestic Worker Micro-Insurance Protection Vault
 * Manages healthcare & accident insurance plans sponsored by employers or workers.
 */
class InsuranceService {

    getAvailablePolicies() {
        return this.getAvailablePlans();
    }

    getAvailablePlans() {
        return [
            {
                id: 'basic_care_plan',
                name: 'Basic Care & Emergency Shield',
                monthlyFeeEtb: 250,
                coverageLimitEtb: 25000,
                benefits: [
                    'Emergency Hospital Outpatient Care',
                    'Workplace Slip & Injury Coverage',
                    'Basic Prescription Medication Allowance'
                ],
                trustScoreBonus: 10,
                badgeTier: 'VERIFIED_INSURED'
            },
            {
                id: 'comprehensive_shield_plan',
                name: 'Comprehensive Health & Life Vault',
                monthlyFeeEtb: 450,
                coverageLimitEtb: 60000,
                benefits: [
                    'Full Hospitalization & Inpatient Surgery',
                    'Accidental Disability & Life Insurance',
                    'Dental & Eye Clinic Coverage',
                    'PLATINUM Guaranteed Profile Badge'
                ],
                trustScoreBonus: 25,
                badgeTier: 'PLATINUM_INSURED'
            }
        ];
    }

    /**
     * Subscribes a domestic worker to a micro-insurance plan.
     */
    async subscribeWorker(workerId, employerId, planId) {
        const plans = this.getAvailablePlans();
        const selectedPlan = plans.find(p => p.id === planId) || plans[0];

        const seeker = await prisma.jobSeeker.findUnique({ where: { id: workerId } });
        if (!seeker) throw new Error('Worker profile not found');

        const updatedPoints = (seeker.rewardPoints || 0) + selectedPlan.trustScoreBonus;
        
        // Upgrade tier to PLATINUM if comprehensive
        const newTier = selectedPlan.id === 'comprehensive_shield_plan' ? 'PLATINUM' : seeker.tier;

        const updatedSeeker = await prisma.jobSeeker.update({
            where: { id: workerId },
            data: {
                rewardPoints: updatedPoints,
                tier: newTier
            }
        });

        return {
            status: 'active',
            message: `Insurance Policy activated for ${updatedSeeker.fullName || 'Worker'}!`,
            policyNumber: `POL-ET-${Date.now().toString().slice(-6)}`,
            plan: selectedPlan,
            worker: updatedSeeker
        };
    }
}

module.exports = new InsuranceService();

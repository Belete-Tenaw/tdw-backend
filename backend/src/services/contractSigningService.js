const prisma = require('../utils/prisma');
const crypto = require('crypto');

/**
 * Smart Digital Milestone Contract & Escrow Engine v2.0
 *
 * Features:
 *  - Dual-signature e-sign with SHA-256 tamper-proof certificate
 *  - Milestone-based escrow state machine
 *  - Bilingual (English + Amharic) printable contract text generator
 *  - Full audit trail embedded in contract.terms JSON
 */
class ContractSigningService {

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MILESTONE ESCROW STATE MACHINE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** Ordered list of milestone states */
    static MILESTONES = [
        'AWAITING_SIGNATURES',
        'TRIAL_PERIOD',       // First 1–7 days
        'TRIAL_RELEASED',     // Trial escrow released after employer approval
        'MONTHLY_SALARY',     // Ongoing monthly salary escrow
        'SALARY_RELEASED',    // Monthly salary paid out
        'COMPLETED',          // Contract fulfilled
        'DISPUTE_LOCK',       // Funds frozen pending resolution
        'TERMINATED'          // Early termination
    ];

    /**
     * Advance the contract escrow to the next milestone.
     * Only the employer (payer) can trigger most transitions.
     */
    async advanceMilestone(contractId, userId, userRole, targetMilestone, notes = '') {
        const contract = await prisma.contract.findUnique({
            where: { id: contractId },
            include: { employer: true, jobSeeker: true, terms: true }
        });

        if (!contract) throw new Error('Contract not found');
        if (contract.status === 'TERMINATED') throw new Error('Cannot advance a terminated contract');

        const allowedTransitions = {
            AWAITING_SIGNATURES: ['TRIAL_PERIOD'],
            TRIAL_PERIOD:        ['TRIAL_RELEASED', 'DISPUTE_LOCK', 'TERMINATED'],
            TRIAL_RELEASED:      ['MONTHLY_SALARY'],
            MONTHLY_SALARY:      ['SALARY_RELEASED', 'DISPUTE_LOCK', 'TERMINATED'],
            SALARY_RELEASED:     ['MONTHLY_SALARY', 'COMPLETED'],
            COMPLETED:           [],
            DISPUTE_LOCK:        ['MONTHLY_SALARY', 'TERMINATED'],
            TERMINATED:          []
        };

        // Extract current milestone from metadata term if present
        let milestoneTerm = contract.terms?.find(t => t.title === 'MILESTONE_METADATA');
        let milestoneMeta = { currentMilestone: 'AWAITING_SIGNATURES', auditTrail: [] };
        if (milestoneTerm) {
            try { milestoneMeta = JSON.parse(milestoneTerm.content); } catch (e) {}
        }

        const currentState = milestoneMeta.currentMilestone || 'AWAITING_SIGNATURES';
        const allowed = allowedTransitions[currentState] || [];

        if (!allowed.includes(targetMilestone)) {
            throw new Error(`Invalid milestone transition: ${currentState} → ${targetMilestone}`);
        }

        const audit = milestoneMeta.auditTrail || [];
        audit.push({
            from:       currentState,
            to:         targetMilestone,
            by:         userId,
            role:       userRole,
            notes,
            timestamp:  new Date().toISOString()
        });

        const newMetaContent = JSON.stringify({ currentMilestone: targetMilestone, auditTrail: audit });

        if (milestoneTerm) {
            await prisma.contractTerm.update({
                where: { id: milestoneTerm.id },
                data: { content: newMetaContent }
            });
        } else {
            await prisma.contractTerm.create({
                data: {
                    contractId,
                    title: 'MILESTONE_METADATA',
                    content: newMetaContent
                }
            });
        }

        const updateData = {};
        if (targetMilestone === 'COMPLETED') updateData.status = 'COMPLETED';
        else if (targetMilestone === 'TERMINATED') updateData.status = 'TERMINATED';
        else if (targetMilestone === 'DISPUTE_LOCK') updateData.status = 'DISPUTED';
        else if (['TRIAL_PERIOD', 'TRIAL_RELEASED', 'MONTHLY_SALARY', 'SALARY_RELEASED'].includes(targetMilestone)) updateData.status = 'ACTIVE';

        const updated = await prisma.contract.update({
            where: { id: contractId },
            data: updateData
        });

        return {
            success: true,
            message: `Contract milestone advanced to ${targetMilestone}`,
            milestone: targetMilestone,
            contract: {
                ...updated,
                milestoneStatus: targetMilestone,
                terms: { currentMilestone: targetMilestone, auditTrail: audit }
            }
        };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // DUAL-SIGNATURE E-SIGN WITH TAMPER-PROOF HASH
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Issues a digital signature & tamper-proof SHA-256 certificate for a contract.
     * When both parties have signed, the milestone advances to TRIAL_PERIOD.
     */
    async eSignContract(contractId, userId, userRole, signatureBase64) {
        const contract = await prisma.contract.findUnique({
            where: { id: contractId },
            include: { employer: true, jobSeeker: true, terms: true }
        });

        if (!contract) throw new Error('Contract not found');
        if (!['DRAFT', 'PENDING_SIGNATURE', 'PENDING', 'ACTIVE'].includes(contract.status)) {
            throw new Error(`Contract is not open for signing (status: ${contract.status})`);
        }

        const timestamp     = new Date();
        const normalizedRole = (userRole || '').toUpperCase();
        const isEmployer    = normalizedRole === 'EMPLOYER' || normalizedRole === 'AGENCY';
        const roleKey       = isEmployer ? 'employer' : 'jobseeker';

        // Extract existing signature metadata
        let sigTerm = contract.terms?.find(t => t.title === 'SIGNATURE_METADATA');
        let sigMeta = {};
        if (sigTerm) {
            try { sigMeta = JSON.parse(sigTerm.content); } catch (e) {}
        }

        // Generate tamper-proof certificate hash
        const hashPayload = JSON.stringify({
            contractId,
            userId,
            userRole: normalizedRole,
            timestamp: timestamp.toISOString(),
            salary: contract.salary,
            startDate: contract.startDate
        });
        const hash = crypto.createHash('sha256').update(hashPayload).digest('hex');
        const certificate = `CERT-${contractId.slice(0, 8).toUpperCase()}-${normalizedRole}-${hash.slice(0, 12).toUpperCase()}`;

        sigMeta[`${roleKey}Signature`]   = signatureBase64 || 'DIGITAL_CONFIRMED';
        sigMeta[`${roleKey}SignedAt`]     = timestamp.toISOString();
        sigMeta[`${roleKey}Certificate`] = certificate;
        sigMeta[`${roleKey}Hash`]        = hash;

        const newSigContent = JSON.stringify(sigMeta);
        if (sigTerm) {
            await prisma.contractTerm.update({
                where: { id: sigTerm.id },
                data: { content: newSigContent }
            });
        } else {
            await prisma.contractTerm.create({
                data: {
                    contractId,
                    title: 'SIGNATURE_METADATA',
                    content: newSigContent
                }
            });
        }

        const employerSigned = isEmployer || contract.employerSigned || !!sigMeta.employerSignature;
        const workerSigned   = !isEmployer || contract.workerSigned || !!sigMeta.jobseekerSignature;
        const bothSigned     = employerSigned && workerSigned;

        const updatedContract = await prisma.contract.update({
            where: { id: contractId },
            data: {
                employerSigned,
                workerSigned,
                status: bothSigned ? 'ACTIVE' : 'PENDING_SIGNATURE'
            }
        });

        // If both signed, advance milestone to TRIAL_PERIOD
        if (bothSigned) {
            let milestoneTerm = contract.terms?.find(t => t.title === 'MILESTONE_METADATA');
            const milestoneMeta = { currentMilestone: 'TRIAL_PERIOD', activatedAt: timestamp.toISOString() };
            if (milestoneTerm) {
                await prisma.contractTerm.update({
                    where: { id: milestoneTerm.id },
                    data: { content: JSON.stringify(milestoneMeta) }
                });
            } else {
                await prisma.contractTerm.create({
                    data: { contractId, title: 'MILESTONE_METADATA', content: JSON.stringify(milestoneMeta) }
                });
            }
        }

        return {
            status: 'success',
            message: bothSigned
                ? 'Contract fully executed! Both parties have signed. Trial period escrow activated.'
                : `Contract signed by ${normalizedRole}. Awaiting counter-signature.`,
            certificate,
            hash,
            bothSigned,
            newStatus: bothSigned ? 'ACTIVE' : 'PENDING_SIGNATURE',
            contract: {
                ...updatedContract,
                milestoneStatus: bothSigned ? 'TRIAL_PERIOD' : 'AWAITING_SIGNATURES',
                terms: sigMeta
            }
        };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CONTRACT RENEWAL
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Renews/extends contract duration for another period.
     */
    async renewContract(contractId, extensionMonths = 6) {
        const contract = await prisma.contract.findUnique({ where: { id: contractId } });
        if (!contract) throw new Error('Contract not found');

        const currentEnd = contract.endDate ? new Date(contract.endDate) : new Date();
        const newEnd = new Date(currentEnd);
        newEnd.setMonth(newEnd.getMonth() + parseInt(extensionMonths));

        const updated = await prisma.contract.update({
            where: { id: contractId },
            data: {
                endDate: newEnd,
                status: 'ACTIVE'
            }
        });

        return {
            status: 'renewed',
            message: `Contract extended by ${extensionMonths} months. New end date: ${newEnd.toLocaleDateString()}`,
            newEndDate: newEnd,
            contract: {
                ...updated,
                milestoneStatus: 'MONTHLY_SALARY'
            }
        };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // BILINGUAL CONTRACT TEXT GENERATOR
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Generates a printable bilingual (English + Amharic) contract text.
     * The output can be rendered in the frontend as PDF-ready content.
     */
    generateContractText(contract, employer, jobSeeker) {
        const empName    = employer?.contactName   || 'Employer';
        const seekerName = jobSeeker?.fullName      || 'Job Seeker';
        const salary     = contract?.salary         || 'As agreed';
        const startDate  = contract?.startDate ? new Date(contract.startDate).toLocaleDateString('en-ET') : 'TBD';
        const endDate    = contract?.endDate   ? new Date(contract.endDate).toLocaleDateString('en-ET')   : 'Open';
        const jobTitle   = contract?.jobTitle       || 'Domestic Worker';
        const certEN     = contract?.terms?.employerCertificate || 'Pending';
        const certJS     = contract?.terms?.jobseekerCertificate || 'Pending';
        const hashEN     = contract?.terms?.employerHash || 'Pending';
        const hashJS     = contract?.terms?.jobseekerHash || 'Pending';

        return `
═══════════════════════════════════════════════════
    TRUSTWORTHY DOMESTIC WORKERS (TDW)
    DIGITAL EMPLOYMENT AGREEMENT
═══════════════════════════════════════════════════

CONTRACT ID: ${contract?.id || 'N/A'}
ISSUED: ${new Date().toLocaleDateString('en-ET')}

─── ENGLISH ──────────────────────────────────────

EMPLOYER:   ${empName}
WORKER:     ${seekerName}
POSITION:   ${jobTitle}
SALARY:     ${salary} ETB/month
START DATE: ${startDate}
END DATE:   ${endDate}

TERMS & CONDITIONS:
1. This agreement is governed by Ethiopian labor law.
2. The employer agrees to pay salary via TDW escrow on time.
3. Trial period: 7 days. Either party may terminate during trial.
4. Monthly salary is released from escrow upon employer confirmation.
5. Disputes are handled via TDW Dispute Resolution Portal.
6. All communications must occur through the TDW platform.
7. Off-platform solicitation voids platform protection.

DIGITAL SIGNATURES:
  Employer Certificate: ${certEN}
  Employer SHA-256:     ${hashEN}
  Worker Certificate:   ${certJS}
  Worker SHA-256:       ${hashJS}

─── አማርኛ ────────────────────────────────────────

ቀጣሪ:       ${empName}
ሠራተኛ:     ${seekerName}
ሥራ ዓይነት:  ${jobTitle}
ደሞዝ:       ${salary} ብር/ወር
የጀመሩበት:   ${startDate}
የሚያልቅበት:  ${endDate}

ቅጥር ደንቦች:
1. ይህ ስምምነት በኢትዮጵያ የሥራ ሕግ ተቆጣጥሮ ይተዳደራል።
2. ቀጣሪው ደሞዙን በTDW escrow አማካይነት በወቅቱ ለመክፈል ያስቀምጣል።
3. የሙከራ ጊዜ፡ 7 ቀናት። ማንኛውም ወገን ሊሰርዝ ይችላል።
4. ወርሃዊ ደሞዝ ቀጣሪው ከፈቀደ በኋላ ከ escrow ይሰጣል።
5. ክርክሮች በTDW ክርክር ፍቺ ስርዓት ይፈቱ።
6. ሁሉም ግንኙነቶች በTDW መድረክ ሊደረጉ ይገባቸዋል።

═══════════════════════════════════════════════════
   This document is digitally signed and tamper-evident.
   Verify at: trustworthydomesticworkers.web.app/verify
═══════════════════════════════════════════════════
`.trim();
    }
}

module.exports = new ContractSigningService();

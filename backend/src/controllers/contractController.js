const prisma = require('../utils/prisma');

// Create a digital contract
exports.createContract = async (req, res) => {
    try {
        const { jobSeekerId, jobPostId, startDate, endDate, salaryAmount, salary, termsConditions, jobType, includeInsurance } = req.body;
        const employerId = req.user.id || req.user.userId;
        const role = (req.user.role || '').toUpperCase();

        if (role !== 'EMPLOYER' && role !== 'AGENCY' && role !== 'ADMIN') {
            return res.status(403).json({ error: "Only employers or agencies can create contracts." });
        }

        const contract = await prisma.contract.create({
            data: {
                employerId,
                jobSeekerId,
                jobPostId: jobPostId || null,
                startDate: new Date(startDate || Date.now()),
                endDate: endDate ? new Date(endDate) : null,
                salary: parseFloat(salaryAmount || salary || 0),
                insuranceFee: includeInsurance ? 250.0 : 0,
                employerSigned: true,
                status: 'PENDING_SIGNATURE',
                terms: termsConditions ? {
                    create: [{
                        title: 'General Terms',
                        content: termsConditions
                    }]
                } : undefined
            },
            include: {
                employer: { select: { id: true, contactName: true, phone: true } },
                jobSeeker: { select: { id: true, fullName: true, phone: true } },
                jobPost: { select: { id: true, title: true } },
                terms: true
            }
        });

        // Add compatibility getters
        const responseData = {
            ...contract,
            salaryAmount: contract.salary,
            termsConditions: termsConditions || ''
        };

        res.status(201).json(responseData);
    } catch (error) {
        console.error("Create contract error:", error);
        res.status(500).json({ error: error.message || "Failed to create contract." });
    }
};

// Sign a contract (Seeker)
exports.signContract = async (req, res) => {
    try {
        const { contractId } = req.params;
        const seekerId = req.user.id || req.user.userId;

        const contract = await prisma.contract.findUnique({
            where: { id: contractId }
        });

        if (!contract || contract.jobSeekerId !== seekerId) {
            return res.status(404).json({ error: "Contract not found or unauthorized." });
        }

        const updatedContract = await prisma.contract.update({
            where: { id: contractId },
            data: {
                workerSigned: true,
                status: 'ACTIVE'
            },
            include: {
                employer: { select: { id: true, contactName: true, phone: true } },
                jobSeeker: { select: { id: true, fullName: true, phone: true } },
                terms: true
            }
        });

        res.json({
            ...updatedContract,
            salaryAmount: updatedContract.salary,
            signedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Sign contract error:", error);
        res.status(500).json({ error: error.message || "Failed to sign contract." });
    }
};

// Get contracts for user
exports.getContracts = async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const role = (req.user.role || '').toUpperCase();

        const where = (role === 'JOB_SEEKER' || role === 'SEEKER')
            ? { jobSeekerId: userId }
            : (role === 'ADMIN' ? {} : { employerId: userId });

        const contracts = await prisma.contract.findMany({
            where,
            include: {
                employer: { select: { id: true, contactName: true, phone: true } },
                jobSeeker: { select: { id: true, fullName: true, phone: true } },
                jobPost: { select: { id: true, title: true } },
                terms: true,
                householdChecklist: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Normalize fields for frontend (salaryAmount, termsConditions)
        const normalized = contracts.map(c => ({
            ...c,
            salaryAmount: c.salary,
            termsConditions: c.terms?.map(t => t.content).join('\n') || ''
        }));

        res.json(normalized);
    } catch (error) {
        console.error("Get contracts error:", error);
        res.status(500).json({ error: "Failed to fetch contracts." });
    }
};

/**
 * ✍️ E-Sign Contract with Digital Certificate Hash
 */
exports.eSignContract = async (req, res) => {
    try {
        const { contractId } = req.params;
        const { signatureBase64, otpCode } = req.body;
        const userId = req.user.id || req.user.userId;
        const userRole = req.user.role;

        const contractSigningService = require('../services/contractSigningService');
        const result = await contractSigningService.eSignContract(contractId, userId, userRole, signatureBase64, otpCode);
        res.json(result);
    } catch (error) {
        console.error('[E-Sign Contract Error]', error);
        res.status(500).json({ error: error.message || 'Failed to e-sign contract' });
    }
};

/**
 * 🔄 Renew Contract Extension
 */
exports.renewContract = async (req, res) => {
    try {
        const { contractId } = req.params;
        const { extensionMonths } = req.body;

        const contractSigningService = require('../services/contractSigningService');
        const result = await contractSigningService.renewContract(contractId, extensionMonths || 6);
        res.json(result);
    } catch (error) {
        console.error('[Renew Contract Error]', error);
        res.status(500).json({ error: error.message || 'Failed to renew contract' });
    }
};
/**
 * 🏛️ Advance Milestone Escrow State
 */
exports.advanceMilestone = async (req, res) => {
    try {
        const { contractId } = req.params;
        const { targetMilestone, notes } = req.body;
        const userId   = req.user.id || req.user.userId;
        const userRole = req.user.role;

        if (!targetMilestone) {
            return res.status(400).json({ error: 'targetMilestone is required' });
        }

        // Authorization: only parties to the contract can advance milestone
        const contract = await prisma.contract.findUnique({ where: { id: contractId } });
        if (!contract) return res.status(404).json({ error: 'Contract not found' });

        const isParty = contract.employerId === userId || contract.jobSeekerId === userId;
        if (!isParty && userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'You are not a party to this contract' });
        }

        const contractSigningService = require('../services/contractSigningService');
        const result = await contractSigningService.advanceMilestone(contractId, userId, userRole, targetMilestone, notes);
        res.json(result);
    } catch (error) {
        console.error('[Advance Milestone Error]', error);
        res.status(400).json({ error: error.message || 'Failed to advance milestone' });
    }
};

/**
 * 📄 Get Contract by ID
 */
exports.getContractById = async (req, res) => {
    try {
        const { contractId } = req.params;
        const userId = req.user.id || req.user.userId;

        const contract = await prisma.contract.findUnique({
            where: { id: contractId },
            include: {
                employer: { select: { contactName: true, phone: true, profilePhoto: true } },
                jobSeeker: { select: { fullName: true, phone: true, profilePhoto: true } },
                jobPost: { select: { title: true } }
            }
        });

        if (!contract) return res.status(404).json({ error: 'Contract not found' });

        const isParty = contract.employerId === userId || contract.jobSeekerId === userId;
        if (!isParty && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(contract);
    } catch (error) {
        console.error('[Get Contract Error]', error);
        res.status(500).json({ error: 'Failed to fetch contract' });
    }
};

/**
 * 📝 Generate Bilingual Contract Text (for PDF printing)
 */
exports.getContractText = async (req, res) => {
    try {
        const { contractId } = req.params;
        const userId = req.user.id || req.user.userId;

        const contract = await prisma.contract.findUnique({
            where: { id: contractId },
            include: {
                employer: true,
                jobSeeker: true,
                jobPost: { select: { title: true } }
            }
        });

        if (!contract) return res.status(404).json({ error: 'Contract not found' });

        const isParty = contract.employerId === userId || contract.jobSeekerId === userId;
        if (!isParty && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const contractSigningService = require('../services/contractSigningService');
        const text = contractSigningService.generateContractText(
            { ...contract, jobTitle: contract.jobPost?.title },
            contract.employer,
            contract.jobSeeker
        );

        res.json({ contractId, text, generatedAt: new Date().toISOString() });
    } catch (error) {
        console.error('[Get Contract Text Error]', error);
        res.status(500).json({ error: 'Failed to generate contract text' });
    }
};

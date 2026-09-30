const prisma = require('../utils/prisma');

// Initiate Escrow (Employer deposits funds)
exports.initiateEscrow = async (req, res) => {
    try {
        const { contractId, amount } = req.body;
        const employerId = req.user.id || req.user.userId;

        const contract = await prisma.contract.findUnique({
            where: { id: contractId }
        });

        if (!contract || contract.employerId !== employerId) {
            return res.status(404).json({ error: "Contract not found or unauthorized." });
        }

        // Create Escrow Record
        const escrow = await prisma.escrowContract.create({
            data: {
                employerId,
                workerId: contract.jobSeekerId,
                jobId: contract.jobPostId,
                amount: parseFloat(amount),
                status: 'FUNDED'
            }
        });

        // Add a note to contract or change its status (we keep it optional)
        res.status(201).json({ message: "Funds held in escrow successfully.", escrow });
    } catch (error) {
        console.error("Initiate escrow error:", error);
        res.status(500).json({ error: "Failed to initiate escrow." });
    }
};

// Release Escrow (Employer releases funds to Seeker)
exports.releaseEscrow = async (req, res) => {
    try {
        const { escrowId } = req.params;
        const employerId = req.user.id || req.user.userId;

        const escrow = await prisma.escrowContract.findUnique({
            where: { id: escrowId }
        });

        if (!escrow || escrow.employerId !== employerId) {
            return res.status(404).json({ error: "Escrow record not found or unauthorized." });
        }

        if (escrow.status !== 'FUNDED') {
            return res.status(400).json({ error: `Cannot release funds in ${escrow.status} status.` });
        }

        const updatedEscrow = await prisma.escrowContract.update({
            where: { id: escrowId },
            data: {
                status: 'RELEASED'
            }
        });

        res.json({ message: "Funds released to worker successfully.", escrow: updatedEscrow });
    } catch (error) {
        console.error("Release escrow error:", error);
        res.status(500).json({ error: "Failed to release escrow." });
    }
};

// Get Escrow records
exports.getEscrows = async (req, res) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;

        const where = role === 'seeker' ? { jobSeekerId: userId } : { employerId: userId };

        const escrows = await prisma.escrowContract.findMany({
            where,
            include: {
                contract: {
                    include: {
                        jobPost: { select: { title: true } }
                    }
                },
                employer: { select: { contactName: true } },
                jobSeeker: { select: { fullName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(escrows);
    } catch (error) {
        console.error("Get escrows error:", error);
        res.status(500).json({ error: "Failed to fetch escrow records." });
    }
};

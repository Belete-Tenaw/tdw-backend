const prisma = require('../utils/prisma');
const { uploadFileToFirebase } = require('../services/firebaseStorageService');

exports.updateProfile = async (req, res) => {
    try {
        const id = req.user.id;
        if (req.user.role !== 'EMPLOYER') return res.status(403).json({ error: 'Forbidden' });

        const { contactName, address, familySize } = req.body;

        let profilePhotoPath;
        let idDocumentPath;

        if (req.files?.profilePhoto) {
            profilePhotoPath = (await uploadFileToFirebase(req.files.profilePhoto[0], 'profile-photos', true)).publicUrl;
        }

        if (req.files?.idDocument) {
            idDocumentPath = (await uploadFileToFirebase(req.files.idDocument[0], 'legal-docs', false)).storagePath;
        }

        // If ID document is updated, reset verification status
        let verificationData = {};
        if (idDocumentPath) {
            verificationData = {
                verificationStatus: 'PENDING',
                isVerified: false
            };
        }

        const updateData = {
            contactName,
            address,
            familySize: familySize ? parseInt(familySize) : undefined,
            ...verificationData
        };

        if (profilePhotoPath) updateData.profilePhoto = profilePhotoPath;
        if (idDocumentPath) updateData.idDocument = idDocumentPath;

        const updated = await prisma.employer.update({
            where: { id },
            data: updateData
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getMyJobPosts = async (req, res) => {
    try {
        const prisma = require('../utils/prisma');
        const jobs = await prisma.jobPost.findMany({
            where: { employerId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getEmployerProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const employer = await prisma.employer.findUnique({
            where: { id },
            select: {
                id: true,
                contactName: true,
                phone: true,
                email: true,
                employerType: true,
                address: true,
                createdAt: true,
                tier: true,
                verificationStatus: true,
                isVerified: true,
                liveSelfieUrl: true
            }
        });

        if (!employer) return res.status(404).json({ error: 'Employer not found' });

        // Double-Key Access Control Masking
        if (!req.hasPremiumAccess && req.user.id !== id) {
            employer.contactName = "HIDDEN (Requires Premium Access)";
            employer.phone = "HIDDEN";
            employer.email = "HIDDEN";
        }

        res.json(employer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
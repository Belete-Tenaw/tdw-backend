const guarantorService = require('../services/guarantorService');

exports.requestVerification = async (req, res) => {
    try {
        const seekerId = req.user.id;
        const { guarantorName, guarantorPhone, guarantorRelationship } = req.body;
        const result = await guarantorService.createVerificationRequest(seekerId, {
            guarantorName,
            guarantorPhone,
            guarantorRelationship
        });
        res.json(result);
    } catch (error) {
        console.error('[Guarantor Request Error]', error);
        res.status(400).json({ error: error.message || 'Failed to create guarantor invite' });
    }
};

exports.getStatus = async (req, res) => {
    try {
        const seekerId = req.user.id;
        const status = await guarantorService.getGuarantorStatus(seekerId);
        res.json(status);
    } catch (error) {
        console.error('[Guarantor Status Error]', error);
        res.status(500).json({ error: 'Failed to get guarantor status' });
    }
};

exports.getPublicConsentDetails = async (req, res) => {
    try {
        const { token } = req.params;
        const details = await guarantorService.getPublicConsentDetails(token);
        res.json(details);
    } catch (error) {
        console.error('[Guarantor Public Details Error]', error);
        res.status(400).json({ error: error.message || 'Invalid or expired verification link' });
    }
};

exports.verifyConsent = async (req, res) => {
    try {
        const { token, otpCode, signatureData } = req.body;
        const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
        const result = await guarantorService.verifyGuarantorConsent(token, otpCode, {
            ...signatureData,
            ipAddress
        });
        res.json(result);
    } catch (error) {
        console.error('[Guarantor Verify Error]', error);
        res.status(400).json({ error: error.message || 'Consent verification failed' });
    }
};

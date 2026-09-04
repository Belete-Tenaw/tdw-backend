const insuranceService = require('../services/insuranceService');

exports.getPlans = async (req, res) => {
    res.json({
        status: 'success',
        plans: insuranceService.getAvailablePlans()
    });
};

exports.subscribePlan = async (req, res) => {
    try {
        const { workerId, planId } = req.body;
        const employerId = req.user.id;
        if (!workerId) return res.status(400).json({ error: 'Worker ID is required' });

        const result = await insuranceService.subscribeWorker(workerId, employerId, planId);
        res.json(result);
    } catch (error) {
        console.error('[Insurance Subscribe Error]', error);
        res.status(500).json({ error: error.message || 'Failed to activate insurance' });
    }
};

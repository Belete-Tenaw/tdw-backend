const checklistService = require('../services/householdChecklistService');

exports.getChecklist = async (req, res) => {
    try {
        const { contractId } = req.params;
        const result = await checklistService.getChecklistByContract(contractId);
        res.json(result);
    } catch (error) {
        console.error('[Get Checklist Error]', error);
        res.status(400).json({ error: error.message || 'Failed to fetch checklist' });
    }
};

exports.updateChecklist = async (req, res) => {
    try {
        const { contractId } = req.params;
        const { items } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;
        const result = await checklistService.saveOrUpdateChecklist(contractId, userId, userRole, items);
        res.json(result);
    } catch (error) {
        console.error('[Update Checklist Error]', error);
        res.status(400).json({ error: error.message || 'Failed to update checklist' });
    }
};

exports.signChecklist = async (req, res) => {
    try {
        const { contractId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        const result = await checklistService.signChecklist(contractId, userId, userRole);
        res.json(result);
    } catch (error) {
        console.error('[Sign Checklist Error]', error);
        res.status(400).json({ error: error.message || 'Failed to sign checklist' });
    }
};

exports.signClearance = async (req, res) => {
    try {
        const { contractId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        const result = await checklistService.signDepartureClearance(contractId, userId, userRole);
        res.json(result);
    } catch (error) {
        console.error('[Sign Clearance Error]', error);
        res.status(400).json({ error: error.message || 'Failed to sign departure clearance' });
    }
};

const attendanceService = require('../services/attendanceService');

exports.clockIn = async (req, res) => {
    try {
        const workerId = req.user.id;
        const { contractId, latitude, longitude } = req.body;
        if (!contractId) return res.status(400).json({ error: 'Contract ID is required' });

        const result = await attendanceService.clockIn(contractId, workerId, latitude, longitude);
        res.json(result);
    } catch (error) {
        console.error('[Attendance Clock-In Error]', error);
        res.status(500).json({ error: error.message || 'Clock-in failed' });
    }
};

exports.clockOut = async (req, res) => {
    try {
        const workerId = req.user.id;
        const { contractId, latitude, longitude } = req.body;
        if (!contractId) return res.status(400).json({ error: 'Contract ID is required' });

        const result = await attendanceService.clockOut(contractId, workerId, latitude, longitude);
        res.json(result);
    } catch (error) {
        console.error('[Attendance Clock-Out Error]', error);
        res.status(500).json({ error: error.message || 'Clock-out failed' });
    }
};

exports.getMyShifts = async (req, res) => {
    try {
        const workerId = req.user.id;
        const history = await attendanceService.getShiftHistory(workerId);
        res.json({ status: 'success', count: history.length, shifts: history });
    } catch (error) {
        console.error('[Attendance History Error]', error);
        res.status(500).json({ error: 'Failed to fetch shift history' });
    }
};

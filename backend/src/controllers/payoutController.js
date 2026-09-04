const payoutEngineService = require('../services/payoutEngineService');

exports.disburseTelebirr = async (req, res) => {
    try {
        const userId = req.user.id;
        const { accountNumber, amount } = req.body;
        const result = await payoutEngineService.processPayout(userId, 'TELEBIRR', accountNumber, parseFloat(amount));
        res.json(result);
    } catch (error) {
        console.error('[Telebirr Payout Error]', error);
        res.status(500).json({ error: error.message || 'Telebirr payout failed' });
    }
};

exports.disburseCbeBirr = async (req, res) => {
    try {
        const userId = req.user.id;
        const { accountNumber, amount } = req.body;
        const result = await payoutEngineService.processPayout(userId, 'CBE_BIRR', accountNumber, parseFloat(amount));
        res.json(result);
    } catch (error) {
        console.error('[CBE Birr Payout Error]', error);
        res.status(500).json({ error: error.message || 'CBE Birr payout failed' });
    }
};

const voiceCopilotService = require('../services/voiceCopilotService');

exports.getQuestions = async (req, res) => {
    const { lang } = req.query;
    res.json({
        status: 'success',
        language: lang || 'am',
        questions: voiceCopilotService.getInterviewQuestions(lang || 'am')
    });
};

exports.submitInterview = async (req, res) => {
    try {
        const seekerId = req.user.id;
        const { language, audioResponses } = req.body;
        const result = await voiceCopilotService.submitInterviewResponse(seekerId, language, audioResponses);
        res.json(result);
    } catch (error) {
        console.error('[Voice Copilot Submit Error]', error);
        res.status(500).json({ error: error.message || 'Failed to submit voice interview' });
    }
};

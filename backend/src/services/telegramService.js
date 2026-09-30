const axios = require('axios');

class TelegramService {
    constructor() {
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
        this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    }

    /**
     * Send a direct message to a user via Telegram Bot API
     * @param {string} chatId - The Telegram internal user chat ID (must have started the bot)
     * @param {string} text - The message to send
     */
    async sendMessage(chatId, text) {
        if (!this.botToken) {
            console.warn('[TelegramService] Telegram Bot Token is not configured. Mocking send...');
            
            return true;
        }

        if (!chatId) {
            console.error('[TelegramService] Cannot send message without a chatId');
            return false;
        }

        try {
            const endpoint = `${this.baseUrl}/sendMessage`;
            const response = await axios.post(endpoint, {
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML' // Allow basic formatting like bold (<b>) / italic (<i>)
            });

            if (response.data.ok) {
                
                return true;
            } else {
                console.error(`[TelegramService] Failed to send to ${chatId}:`, response.data);
                return false;
            }
        } catch (error) {
            console.error(`[TelegramService] Axios error sending to ${chatId}:`, error.message);
            // Don't crash the server if telegram fails
            return false;
        }
    }

    /**
     * Send a message with inline keyboard button(s).
     * @param {string} chatId
     * @param {string} text
     * @param {object|object[]} buttons - { text, url } or array of rows
     */
    async sendMessageWithButton(chatId, text, buttons) {
        if (!this.botToken) {
            console.warn('[TelegramService] Token not configured. Mocking sendMessageWithButton.');
            return true;
        }
        if (!chatId) {
            console.error('[TelegramService] Cannot send without chatId');
            return false;
        }

        // Normalise to inline_keyboard 2D array
        let inline_keyboard;
        if (Array.isArray(buttons)) {
            inline_keyboard = buttons.map(b => Array.isArray(b) ? b : [b]);
        } else {
            inline_keyboard = [[buttons]];
        }

        try {
            const response = await axios.post(`${this.baseUrl}/sendMessage`, {
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard }
            });
            return response.data.ok;
        } catch (error) {
            console.error(`[TelegramService] sendMessageWithButton error to ${chatId}:`, error.message);
            return false;
        }
    }

    /**
     * Send revenue/payment alerts to the platform admin
     */
    async notifyAdmin(text) {
        const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
        if (!adminChatId) {
            console.warn('[TelegramService] Admin Telegram Chat ID not configured.');
            return false;
        }
        return await this.sendMessage(adminChatId, `💰 <b>Revenue Alert</b>\n\n${text}`);
    }

    /**
     * Send a rich structured admin alert with action button.
     */
    async notifyAdminRich(text, buttonLabel = '🔍 View in Admin', buttonUrl = null) {
        const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
        if (!adminChatId) return false;
        const url = buttonUrl || (process.env.CLIENT_URL || 'https://trustworthydomesticworkers.web.app') + '/admin';
        return await this.sendMessageWithButton(adminChatId, text, { text: buttonLabel, url });
    }
}

module.exports = new TelegramService();


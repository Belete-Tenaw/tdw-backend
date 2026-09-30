/**
 * SMS Dispatcher Service
 * Primary:  AfroMessage  (Ethiopian gateway — supports Amharic + Latin)
 * Fallback: Africa's Talking (pan-African coverage)
 *
 * Required ENV vars (at least one provider must be configured):
 *   AFROMESSAGE_API_KEY      - AfroMessage bearer token
 *   AFROMESSAGE_SENDER       - Registered sender name, e.g. "TDW"
 *   AFRICASTALKING_API_KEY   - Africa's Talking API key
 *   AFRICASTALKING_USERNAME  - Username (use 'sandbox' for testing)
 *   AFRICASTALKING_SENDER    - Short-code or alphanumeric ID (optional)
 */

const axios = require('axios');

const AFROMSG_API  = 'https://api.afromessage.com/api/send';
const AFRICAST_API = 'https://api.africastalking.com/version1/messaging';

/**
 * Send SMS via AfroMessage (primary) then Africa's Talking (fallback).
 * In development with no keys, logs to console and returns mock success.
 *
 * @param {string} phoneNumber - E.164 format, e.g. "+251912345678"
 * @param {string} message
 * @returns {Promise<{success: boolean, provider: string, gatewayId?: string, error?: string}>}
 */
exports.sendSMS = async (phoneNumber, message) => {
    if (!phoneNumber || !message) throw new Error('Phone number and message are required.');

    // ── Primary: AfroMessage ────────────────────────────────────────────────
    if (process.env.AFROMESSAGE_API_KEY) {
        try {
            const response = await axios.post(
                AFROMSG_API,
                { to: phoneNumber, message, sender: process.env.AFROMESSAGE_SENDER || 'TDW' },
                {
                    headers: {
                        Authorization: 'Bearer ' + process.env.AFROMESSAGE_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    timeout: 8000
                }
            );
            const d = response.data;
            if (d && (d.acknowledge === 'success' || d.status === 200 || d.code === 0)) {
                return { success: true, provider: 'afromessage', gatewayId: d.messageId || d.id };
            }
            console.warn('[SMS] AfroMessage non-success response:', d);
        } catch (err) {
            console.warn('[SMS] AfroMessage error — trying fallback:', err.message);
        }
    }

    // ── Fallback: Africa's Talking ──────────────────────────────────────────
    if (process.env.AFRICASTALKING_API_KEY) {
        try {
            const params = new URLSearchParams({
                username: process.env.AFRICASTALKING_USERNAME || 'sandbox',
                to: phoneNumber,
                message
            });
            if (process.env.AFRICASTALKING_SENDER) params.append('from', process.env.AFRICASTALKING_SENDER);

            const response = await axios.post(AFRICAST_API, params.toString(), {
                headers: {
                    apiKey: process.env.AFRICASTALKING_API_KEY,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json'
                },
                timeout: 8000
            });

            const recipients = response.data && response.data.SMSMessageData ? response.data.SMSMessageData.Recipients : [];
            if (recipients.length > 0) {
                const first = recipients[0];
                if (first.status === 'Success' || first.statusCode === '101') {
                    return { success: true, provider: 'africastalking', gatewayId: first.messageId };
                }
            }
            console.warn("[SMS] Africa's Talking non-success:", response.data);
        } catch (err) {
            console.error("[SMS] Africa's Talking error:", err.message);
        }
    }

    // ── Dev / No Keys ───────────────────────────────────────────────────────
    if (process.env.NODE_ENV !== 'production') {
        console.log('\n[SMS MOCK] -> ' + phoneNumber);
        console.log('[SMS MOCK] "' + message + '"');
        console.log('[SMS MOCK] Mock delivered\n');
        return { success: true, provider: 'mock', gatewayId: 'MOCK-' + Math.random().toString(36).slice(2, 8) };
    }

    return { success: false, error: 'All SMS providers failed or no API keys configured', provider: 'none' };
};

/**
 * Send a localised OTP SMS with retry-friendly messaging.
 */
exports.sendOTP = async (phoneNumber, otp, language = 'en') => {
    const msgs = {
        en: 'Your TDW code: ' + otp + '. Valid 10 min. Do not share.',
        am: 'የTDW ኮድዎ: ' + otp + '። ለ10 ደቂቃ ብቻ ይሠራል።',
        om: 'Koodii TDW: ' + otp + '. Daqiiqaa 10 qofa.',
        ti: 'ናይ TDW ኮድ: ' + otp + '። ን10 ደቒቃ ጥራሕ።'
    };
    return exports.sendSMS(phoneNumber, msgs[language] || msgs.en);
};

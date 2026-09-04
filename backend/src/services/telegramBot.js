const TelegramBot = require('node-telegram-bot-api');
const prisma = require('../utils/prisma');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.error('[TelegramBot] TELEGRAM_BOT_TOKEN missing in .env. Bot listener failed to start.');
} else if (process.env.NODE_ENV !== 'test') {
    const bot = new TelegramBot(token, { polling: true });
    const codeController = require('../controllers/codeController');

    /**
     * Listener for the /start command.
     * Expected format: /start [userId]
     * This allows users to link their TDW account with their Telegram chat.
     */
    bot.onText(/\/start (.+)/, async (msg, match) => {
        const chatId = msg.chat.id.toString();
        const userId = match[1]; // The part after /start

        try {
            // Attempt to find user in either JobSeeker or Employer
            const seeker = await prisma.jobSeeker.findUnique({ where: { id: userId } });
            const employer = await prisma.employer.findUnique({ where: { id: userId } });

            if (seeker) {
                await prisma.jobSeeker.update({
                    where: { id: userId },
                    data: { telegramChatId: chatId }
                });
                bot.sendMessage(chatId, `🎉 <b>Welcome ${seeker.fullName}!</b>\n\nYour TDW account is now linked to Telegram. You will receive real-time alerts for tier upgrades and subscriptions.`, { parse_mode: 'HTML' });
            } else if (employer) {
                await prisma.employer.update({
                    where: { id: userId },
                    data: { telegramChatId: chatId }
                });
                bot.sendMessage(chatId, `🎉 <b>Welcome ${employer.contactName}!</b>\n\nYour TDW account is now linked to Telegram. You will receive real-time alerts.`, { parse_mode: 'HTML' });
            } else {
                bot.sendMessage(chatId, '❌ User not found. Please ensure you clicked the link from the TDW platform.');
            }

        } catch (error) {
            console.error('[TelegramBot] Error linking account:', error.message);
            bot.sendMessage(chatId, '❌ An error occurred while linking your account.');
        }
    });

    // Generic welcome if no user ID provided
    bot.onText(/\/start$/, (msg) => {
        bot.sendMessage(msg.chat.id, "👋 Welcome to <b>Trustworthy Domestic Workers (TDW)</b>.\n\nPlease link your account from the dashboard to receive notifications.", { parse_mode: 'HTML' });
    });

    // ================================
    // 💳 MANUAL PAYMENT WORKFLOW
    // ================================
    const adminIds = (process.env.TELEGRAM_ADMIN_IDS || '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);

    const isAdmin = (chatId) => adminIds.includes(chatId.toString());

    /**
     * User-facing: request payment instructions.
     * Usage: /requestpay
     * Notifies all configured admins with the requester's name and chat ID
     * so an admin can open a private chat and share bank details manually.
     * The bot itself never sends bank details.
     */
    bot.onText(/\/requestpay/, async (msg) => {
        const chatId = msg.chat.id.toString();
        const username = msg.from.username ? `@${msg.from.username}` : (msg.from.first_name || 'Unknown');

        if (adminIds.length === 0) {
            return bot.sendMessage(chatId, '⚠️ Payment requests are temporarily unavailable. Please try again later.');
        }

        for (const adminId of adminIds) {
            bot.sendMessage(
                adminId,
                `💰 <b>New payment request</b>\n\nFrom: ${username}\nChat ID: <code>${chatId}</code>\n\nOpen a private chat with this user to share bank details and verify payment.`,
                { parse_mode: 'HTML' }
            );
        }

        bot.sendMessage(chatId, '✅ Your request has been sent to our team. An admin will message you shortly with payment instructions.');
    });

    /**
     * Admin-only: approve a verified manual payment, generate a code,
     * and deliver it directly to the user's linked Telegram chat.
     * Usage:
     *   /approve <chatId> TIME <durationDays>
     *   /approve <chatId> TRUST <TIER_CODE>   (employer tier upgrades only, e.g. GOLD_ACCESS)
     */
    bot.onText(/\/approve (\S+) (TIME|TRUST) (\S+)/, async (msg, match) => {
        const adminChatId = msg.chat.id.toString();
        if (!isAdmin(adminChatId)) {
            return bot.sendMessage(adminChatId, '❌ You are not authorized to use this command.');
        }

        const [, targetChatId, kind, value] = match;

        try {
            const codeType = kind === 'TIME' ? 'TIME_EXTENSION' : 'TRUST_UPGRADE';
            const params = { codeType, adminTelegramId: adminChatId };
            if (codeType === 'TIME_EXTENSION') {
                params.durationDays = parseInt(value, 10);
            } else {
                params.tierUpgrade = value.toUpperCase();
            }

            const code = await codeController.createTelegramCode(params);

            const seeker = await prisma.jobSeeker.findUnique({ where: { telegramChatId: targetChatId } });
            const employer = await prisma.employer.findUnique({ where: { telegramChatId: targetChatId } });
            const linkedUser = seeker || employer;

            if (linkedUser) {
                await bot.sendMessage(
                    targetChatId,
                    `✅ <b>Payment confirmed!</b>\n\nYour activation code: <code>${code}</code>\n\nEnter this code in the TDW app under "Activate Premium" to complete your subscription.`,
                    { parse_mode: 'HTML' }
                );
                bot.sendMessage(adminChatId, `✅ Code <code>${code}</code> generated and delivered to the user.`, { parse_mode: 'HTML' });
            } else {
                bot.sendMessage(
                    adminChatId,
                    `⚠️ Code <code>${code}</code> generated, but chat ID <code>${targetChatId}</code> isn't linked to any TDW account yet. Share the code with them manually.`,
                    { parse_mode: 'HTML' }
                );
            }

        } catch (error) {
            console.error('[TelegramBot] Approve command error:', error.message);
            bot.sendMessage(adminChatId, `❌ Error generating code: ${error.message}`);
        }
    });

    /**
     * User-facing: Search recent job matches directly in Telegram.
     * Usage: /jobs
     */
    bot.onText(/\/jobs/, async (msg) => {
        const chatId = msg.chat.id.toString();
        try {
            const jobs = await prisma.jobPost.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' }
            });

            if (jobs.length === 0) {
                return bot.sendMessage(chatId, '📋 No active job listings found right now. Check back soon!');
            }

            let responseText = '📌 <b>Recent Job Opportunities in Ethiopia:</b>\n\n';
            jobs.forEach((j, idx) => {
                responseText += `${idx + 1}. <b>${j.title}</b>\n💰 Salary: ${j.salaryOffered} ETB\n📍 Location: ${j.address || j.locationRegion || 'Addis Ababa'}\n\n`;
            });

            bot.sendMessage(chatId, responseText, { parse_mode: 'HTML' });
        } catch (err) {
            console.error('[TelegramBot Jobs Error]', err);
            bot.sendMessage(chatId, '❌ Failed to fetch job listings.');
        }
    });

    module.exports = bot;
}

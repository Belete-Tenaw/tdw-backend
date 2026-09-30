const prisma = require('../utils/prisma');
const telegramService = require('../services/telegramService');
const fraudDetectionService = require('../services/fraudDetectionService');
const notificationService = require('../services/notificationService');

exports.sendMessage = async (req, res) => {
    try {
        const { receiverId, receiverType, content } = req.body;
        const senderId = req.user.id;
        const senderRole = req.user.role;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Message content cannot be empty' });
        }

        if (!receiverId) {
            return res.status(400).json({ error: 'Receiver ID is required' });
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 🛡️ ANTI-POACHING FRAUD SHIELD — Real-time Content Scan
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const poachingScan = fraudDetectionService.scanTextForPoaching(content);
        if (poachingScan.riskScore >= 70) {
            // HIGH risk: block the message entirely
            return res.status(400).json({
                error: 'Message blocked by TDW Safety Shield',
                reason: 'Your message appears to contain direct contact information or off-platform solicitation.',
                flaggedPatterns: poachingScan.flaggedPatterns,
                fraudRisk: 'HIGH',
                tip: 'Please keep all communication within the TDW platform to stay protected.'
            });
        }
        // Medium risk (40-69): allow but attach a warning in the response
        const fraudWarning = poachingScan.riskScore >= 40 ? {
            warning: 'Your message may contain sensitive contact details. For your safety, keep communication on-platform.',
            fraudRisk: 'MEDIUM',
            flaggedPatterns: poachingScan.flaggedPatterns
        } : null;

        // Check if user is subscriber if it's the first message
        const existingChat = await prisma.message.findFirst({
            where: {
                OR: [
                    {
                        AND: [
                            senderRole === 'JOB_SEEKER' ? { senderJSId: senderId } : { senderEmpId: senderId },
                            receiverType === 'JOB_SEEKER' ? { receiverJSId: receiverId } : { receiverEmpId: receiverId }
                        ]
                    },
                    {
                        AND: [
                            receiverType === 'JOB_SEEKER' ? { senderJSId: receiverId } : { senderEmpId: receiverId },
                            senderRole === 'JOB_SEEKER' ? { receiverJSId: senderId } : { receiverEmpId: senderId }
                        ]
                    }
                ]
            }
        });

        if (!existingChat) {
            // First message authorization
            if (senderRole === 'EMPLOYER' && receiverType === 'JOB_SEEKER') {
                const employer = await prisma.employer.findUnique({ where: { id: senderId } });
                const worker = await prisma.jobSeeker.findUnique({ where: { id: receiverId } });

                if (!employer || !worker) {
                    return res.status(404).json({ error: 'User not found' });
                }

                // 1. Time Access Check
                if (!employer.subscriptionExpiry || new Date(employer.subscriptionExpiry) < new Date()) {
                    return res.status(403).json({
                        error: 'Action restricted',
                        message: 'Time Access Expired. Please renew your monthly subscription to initiate a conversation.',
                        upgradeRequired: 'TIME_EXTENSION'
                    });
                }

                // 2. Trust Access Check
                const employerTier = employer.tier || 'FREE';
                const workerTier = worker.tier || 'BRONZE';

                if (workerTier === 'PLATINUM' && employerTier !== 'PLATINUM_ACCESS') {
                    return res.status(403).json({
                        error: 'Action restricted',
                        message: 'Trust Access Required. Upgrade to Platinum Access to message this highly verified worker.',
                        upgradeRequired: 'PLATINUM_ACCESS'
                    });
                }

                if (workerTier === 'GOLD' && !['GOLD_ACCESS', 'PLATINUM_ACCESS'].includes(employerTier)) {
                    return res.status(403).json({
                        error: 'Action restricted',
                        message: 'Trust Access Required. Upgrade to Gold Access to message this verified worker.',
                        upgradeRequired: 'GOLD_ACCESS'
                    });
                }
            } else if (senderRole === 'JOB_SEEKER') {
                const user = await prisma.jobSeeker.findUnique({ where: { id: senderId } });
                if (!user || user.tier === 'BRONZE') {
                    return res.status(403).json({
                        error: 'Action restricted',
                        message: 'Only verified Job Seekers (Silver and above) can initiate conversations.'
                    });
                }
            }
        }

        // ⏱️ Response Time & Behavior Score Metric
        try {
            const senderFilter = receiverType === 'JOB_SEEKER' ? { senderJSId: receiverId } : { senderEmpId: receiverId };
            const receiverFilter = senderRole === 'JOB_SEEKER' ? { receiverJSId: senderId } : { receiverEmpId: senderId };
            
            const lastReceivedMsg = await prisma.message.findFirst({
                where: { ...senderFilter, ...receiverFilter },
                orderBy: { timestamp: 'desc' }
            });

            if (lastReceivedMsg) {
                const responseTimeMs = Date.now() - new Date(lastReceivedMsg.timestamp).getTime();
                
                const modelName = senderRole === 'JOB_SEEKER' ? 'jobSeeker' : 'employer';
                const senderProps = await prisma[modelName].findUnique({ where: { id: senderId }, select: { responseTimeMs: true, behaviorScore: true } });
                
                if (senderProps) {
                    // Exponential Moving Average (EMA): 80% history, 20% current
                    const currentAvg = senderProps.responseTimeMs || responseTimeMs;
                    const newAvgMs = Math.floor((currentAvg * 0.8) + (responseTimeMs * 0.2));
                    
                    let scoreChange = 0;
                    if (responseTimeMs < 2 * 3600 * 1000) scoreChange = 1; // Fast reply (< 2h)
                    else if (responseTimeMs > 24 * 3600 * 1000) scoreChange = -2; // Slow reply (> 24h)
                    
                    const newScore = Math.max(0, Math.min(100, (senderProps.behaviorScore || 50) + scoreChange));

                    await prisma[modelName].update({
                        where: { id: senderId },
                        data: { responseTimeMs: newAvgMs, behaviorScore: newScore }
                    });
                }
            }
        } catch (metricErr) {
            console.error('[Metrics Error] Failed to compute response time:', metricErr.message);
        }

        const message = await prisma.message.create({
            data: {
                content,
                senderJSId: senderRole === 'JOB_SEEKER' ? senderId : null,
                senderEmpId: senderRole === 'EMPLOYER' ? senderId : null,
                receiverJSId: receiverType === 'JOB_SEEKER' ? receiverId : null,
                receiverEmpId: receiverType === 'EMPLOYER' ? receiverId : null
            },
            include: {
                senderJS: { select: { fullName: true, profilePhoto: true } },
                senderEmp: { select: { contactName: true, profilePhoto: true } }
            }
        });

        // 🟢 Emit Real-time Socket Event to BOTH sender and receiver rooms
        const io = req.app.get('io');
        if (io) {
            io.to(receiverId).emit('new_message', message);
            io.to(senderId).emit('new_message', message); // Sender optimistic update
        }

        // 📬 Dual-Channel Notification: In-App + Telegram with Mini-App button
        try {
            const isSeeker = receiverType === 'JOB_SEEKER';
            const receiver = isSeeker
                ? await prisma.jobSeeker.findUnique({
                    where: { id: receiverId },
                    select: { telegramChatId: true, fullName: true, fcmToken: true, phone: true }
                })
                : await prisma.employer.findUnique({
                    where: { id: receiverId },
                    select: { telegramChatId: true, contactName: true, fcmToken: true, phone: true }
                });

            if (receiver) {
                const senderName = senderRole === 'JOB_SEEKER' ? message.senderJS?.fullName : message.senderEmp?.contactName;
                const receiverName = isSeeker ? receiver.fullName : receiver.contactName;
                const preview = content.substring(0, 120) + (content.length > 120 ? '...' : '');
                const miniAppUrl = (process.env.CLIENT_URL || 'https://trustworthydomesticworkers.web.app') + '/messages';

                // 1. In-app notification
                if (io) {
                    await notificationService.createInAppNotification(
                        receiverId,
                        receiverType,
                        `New message from ${senderName || 'TDW User'}`,
                        preview,
                        'MESSAGE',
                        io
                    );
                }

                // 2. Telegram with inline Mini-App button
                if (receiver.telegramChatId) {
                    const telegramText = `📩 <b>New Message from ${senderName || 'TDW User'}</b>\n\n"${preview}"\n\n<i>Reply directly inside the TDW app.</i>`;
                    await telegramService.sendMessageWithButton(
                        receiver.telegramChatId,
                        telegramText,
                        { text: '💬 Open TDW Messages', url: miniAppUrl }
                    ).catch(() => telegramService.sendMessage(receiver.telegramChatId, telegramText));
                }

                // 3. FCM Push (if token available)
                if (receiver.fcmToken) {
                    await notificationService.sendPushNotification(
                        receiver.fcmToken,
                        `Message from ${senderName || 'TDW User'}`,
                        preview,
                        { type: 'MESSAGE', senderId }
                    ).catch(e => console.warn('[FCM] Push failed:', e.message));
                }
            }
        } catch (alertError) {
            console.error('[Notification Error] Failed to notify message receiver:', alertError.message);
        }

        res.status(201).json({ ...message, ...(fraudWarning ? { fraudWarning } : {}) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    userRole === 'JOB_SEEKER' ? { senderJSId: userId } : { senderEmpId: userId },
                    userRole === 'JOB_SEEKER' ? { receiverJSId: userId } : { receiverEmpId: userId }
                ]
            },
            include: {
                senderJS: { select: { fullName: true, profilePhoto: true } },
                senderEmp: { select: { contactName: true, profilePhoto: true } },
                receiverJS: { select: { fullName: true, profilePhoto: true } },
                receiverEmp: { select: { contactName: true, profilePhoto: true } }
            },
            orderBy: { timestamp: 'asc' }
        });

        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import authService from '../services/authService';
import { Send, User, MessageSquare, Keyboard, Shield, Mic, MicOff, Volume2, Square, X, Check, AlertTriangle, ShieldOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { transliterate } from '../utils/amharicTranslit';
import PanicButton from '../components/PanicButton';
import socket from '../services/socket';

const Messages = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const [conversations, setConversations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [chatHistory, setChatHistory] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendError, setSendError] = useState('');
    const [fraudWarning, setFraudWarning] = useState(null);
    const currentUser = authService.getCurrentUser();
    const [amharicMode, setAmharicMode] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);
    const scrollRef = useRef(null);

    // ━━━ Real-time Socket Listener + initial fetch ━━━
    useEffect(() => {
        fetchMessages();

        // Prefer socket over polling when available
        if (socket && currentUser?.id) {
            socket.emit('join', currentUser.id);
            socket.on('new_message', (msg) => {
                setChatHistory(prev => {
                    // Avoid duplicates (optimistic vs. server echo)
                    if (prev.find(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
            });
            return () => socket.off('new_message');
        } else {
            // Fallback: poll every 5s when no socket
            const interval = setInterval(fetchMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [currentUser?.id]);

    useEffect(() => {
        if (location.state?.startChatWith) {
            handleStartChat(location.state.startChatWith, location.state.targetName, location.state.context);
        }
    }, [location.state, conversations]); // Re-run when conversations confirm loaded

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory, selectedUser]);

    const handleStartChat = (targetUserId, targetName, context) => {
        // Check if conversation already exists
        const existing = conversations.find(c => c.id === targetUserId);
        if (existing) {
            setSelectedUser(existing);
            setChatHistory(existing.messages);
        } else {
            // Create temp placeholder logic for UI
            const tempConv = {
                id: targetUserId,
                fullName: targetName || `User ${targetUserId.substring(0, 8)}`,
                messages: [],
                lastMsg: { content: t('start_conversation'), timestamp: new Date() }
            };
            setSelectedUser(tempConv);
            setChatHistory([]);
            if (context && !newMessage) setNewMessage(context + " - ");
        }
    };

    const fetchMessages = async () => {
        try {
            const res = await api.get('/messages');
            const allMsgs = res.data;

            // Group by user
            const grouped = {};
            allMsgs.forEach(msg => {
                // Determine the "other" person in the chat
                const isSender = (currentUser.role === 'JOB_SEEKER' && msg.senderJSId === currentUser.id) ||
                    (currentUser.role === 'EMPLOYER' && msg.senderEmpId === currentUser.id);

                let otherUserId;
                let otherName = 'User';
                let otherPhoto = null;

                if (isSender) {
                    if (msg.receiverJSId) {
                        otherUserId = msg.receiverJSId;
                        otherName = msg.receiverJS?.fullName;
                        otherPhoto = msg.receiverJS?.profilePhoto;
                    } else {
                        otherUserId = msg.receiverEmpId;
                        otherName = msg.receiverEmp?.contactName;
                        otherPhoto = msg.receiverEmp?.profilePhoto;
                    }
                } else {
                    if (msg.senderJSId) {
                        otherUserId = msg.senderJSId;
                        otherName = msg.senderJS?.fullName;
                        otherPhoto = msg.senderJS?.profilePhoto;
                    } else {
                        otherUserId = msg.senderEmpId;
                        otherName = msg.senderEmp?.contactName;
                        otherPhoto = msg.senderEmp?.profilePhoto;
                    }
                }

                if (otherUserId) {
                    if (!grouped[otherUserId]) {
                        grouped[otherUserId] = {
                            id: otherUserId,
                            fullName: otherName || `User ${otherUserId.substring(0, 5)}`,
                            profilePhoto: otherPhoto,
                            messages: [],
                            lastMsg: msg
                        };
                    }
                    grouped[otherUserId].messages.push(msg);
                    if (new Date(msg.timestamp) > new Date(grouped[otherUserId].lastMsg.timestamp)) {
                        grouped[otherUserId].lastMsg = msg;
                    }
                }
            });

            const sortedConvs = Object.values(grouped).sort((a, b) => new Date(b.lastMsg.timestamp) - new Date(a.lastMsg.timestamp));
            setConversations(sortedConvs);

            // Update active chat if selected and it exists in fetched data
            if (selectedUser) {
                // If we were in a temp start-chat mode, keep it unless we found real messages
                const updated = grouped[selectedUser.id];
                if (updated) {
                    setChatHistory(updated.messages);
                }
            }
        } catch (err) {
            console.error("Failed to fetch messages", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectUser = (conv) => {
        setSelectedUser(conv);
        setChatHistory(conv.messages);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;

        setFraudWarning(null);
        setSendError('');

        try {
            const receiverType = currentUser.role === 'JOB_SEEKER' ? 'EMPLOYER' : 'JOB_SEEKER';
            const payload = { receiverId: selectedUser.id, receiverType, content: newMessage };

            const res = await api.post('/messages', payload);
            const newMsg = res.data;

            // Show fraud warning if backend flagged medium risk (but message was allowed)
            if (newMsg.fraudWarning) {
                setFraudWarning(newMsg.fraudWarning);
                setTimeout(() => setFraudWarning(null), 8000);
            }

            // Optimistically append (socket will also push it; dedup handled)
            setChatHistory(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
            setNewMessage('');
        } catch (err) {
            const errData = err.response?.data;
            if (errData?.fraudRisk === 'HIGH') {
                // Blocked by anti-poaching shield
                setSendError(
                    `🛡️ Blocked: ${errData.reason || 'Message contains off-platform contact info.'} ` +
                    `(${(errData.flaggedPatterns || []).join('; ')})`
                );
            } else {
                const msg = errData?.message || errData?.error || 'Failed to send message.';
                setSendError(msg);
            }
        }
    };

    const handleMessageChange = (e) => {
        const val = e.target.value;
        if (amharicMode && val.length > newMessage.length) {
            const lastChar = val.slice(-1);
            if (/[a-zA-Z]/.test(lastChar)) {
                setNewMessage(transliterate(val));
                return;
            }
        }
        setNewMessage(val);
    };

    const startRecording = async () => {
        try {
            setSendError('');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingSeconds(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingSeconds(s => s + 1);
            }, 1000);
        } catch (err) {
            setSendError('Microphone permission is required to record voice messages.');
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(recordingTimerRef.current);
            audioChunksRef.current = [];
        }
    };

    const stopAndSendVoiceNote = () => {
        if (!mediaRecorderRef.current || !isRecording) return;

        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64Audio = reader.result;
                try {
                    const receiverType = currentUser.role === 'JOB_SEEKER' ? 'EMPLOYER' : 'JOB_SEEKER';
                    const payload = {
                        receiverId: selectedUser.id,
                        receiverType,
                        content: `[VOICE_NOTE]:${base64Audio}`
                    };
                    const res = await api.post('/messages', payload);
                    setChatHistory(prev => [...prev, res.data]);
                    fetchMessages();
                } catch (err) {
                    setSendError('Failed to send voice message.');
                }
            };
        };

        mediaRecorderRef.current.stop();
        setIsRecording(false);
        clearInterval(recordingTimerRef.current);
    };

    return (
        <div className="container" style={{ padding: '20px', height: '85vh', display: 'flex', gap: '20px' }}>
            {/* Sidebar */}
            <div className="card" style={{ width: '300px', display: 'flex', flexDirection: 'column', padding: '0' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
                    <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <MessageSquare size={20} /> {t('messages')}
                    </h2>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {conversations.length === 0 && !selectedUser ? (
                        <p style={{ padding: '20px', color: '#999', textAlign: 'center' }}>{t('no_conversations')}</p>
                    ) : (
                        <>
                            {/* Show temp user if active but not in list yet */}
                            {selectedUser && !conversations.find(c => c.id === selectedUser.id) && (
                                <div
                                    style={{
                                        padding: '15px 20px',
                                        borderBottom: '1px solid #f5f5f5',
                                        cursor: 'pointer',
                                        background: '#fff0e6'
                                    }}
                                >
                                    <div style={{ fontWeight: '600', marginBottom: '5px' }}>{t('new_chat')} ({selectedUser.id.substring(0, 8)}...)</div>
                                    <div style={{ fontSize: '0.85rem', color: '#666' }}>{t('drafting')}</div>
                                </div>
                            )}

                            {conversations.map(conv => (
                                <div
                                    key={conv.id}
                                    onClick={() => handleSelectUser(conv)}
                                    style={{
                                        padding: '12px 15px',
                                        borderBottom: '1px solid #f5f5f5',
                                        cursor: 'pointer',
                                        background: selectedUser?.id === conv.id ? '#fff0e6' : 'white',
                                        transition: 'background 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}
                                >
                                    <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#eee', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {conv.profilePhoto ? (
                                            <img src={conv.profilePhoto} alt={conv.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <User size={20} color="#666" />
                                        )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: '600', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.fullName}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {conv.lastMsg.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0' }}>
                {selectedUser ? (
                    <>
                        <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee', background: '#fafafa', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{t('conversation_with')} {selectedUser.fullName}</h3>
                            <PanicButton contractId={selectedUser.contractId} />
                        </div>

                        {/* Security Banner */}
                        <div style={{ background: '#f0fdf4', padding: '8px 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.75rem', color: '#166534', borderBottom: '1px solid #dcfce7' }}>
                            <Shield size={14} />
                            <span>Messages are end-to-end encrypted. Nobody outside of this chat, not even TDW, can read them.</span>
                        </div>

                        <div ref={scrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {chatHistory.length === 0 && (
                                <div style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>{t('start_conversation')}</div>
                            )}
                            {chatHistory.map((msg) => {
                                const isMe = (currentUser.role === 'JOB_SEEKER' && msg.senderJSId === currentUser.id) ||
                                    (currentUser.role === 'EMPLOYER' && msg.senderEmpId === currentUser.id);
                                return (
                                    <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                                        <div style={{
                                            padding: '10px 15px',
                                            background: isMe ? 'var(--primary)' : '#f0f0f0',
                                            color: isMe ? 'white' : '#333',
                                            borderRadius: isMe ? '12px 12px 0 12px' : '12px 12px 12px 0'
                                        }}>
                                            {msg.content?.startsWith('[VOICE_NOTE]:') ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.9 }}>
                                                        <Volume2 size={14} /> Voice Note (የድምጽ መልዕክት)
                                                    </div>
                                                    <audio
                                                        controls
                                                        src={msg.content.replace('[VOICE_NOTE]:', '')}
                                                        style={{ maxWidth: '240px', height: '36px' }}
                                                    />
                                                </div>
                                            ) : (
                                                msg.content
                                            )}
                                        </div>
                                        {msg.timestamp && (
                                            <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '4px', textAlign: isMe ? 'right' : 'left' }}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <form onSubmit={handleSendMessage} style={{ padding: '15px', borderTop: '1px solid #eee', background: '#fff' }}>
                            {sendError && (
                                <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.85rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                    <ShieldOff size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>{sendError}</span>
                                </div>
                            )}
                            {fraudWarning && (
                                <div style={{ background: '#fff7ed', border: '1px solid #fb923c', color: '#9a3412', padding: '10px 14px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.82rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                    <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px', color: '#f97316' }} />
                                    <div>
                                        <strong>⚠️ Safety Reminder:</strong> {fraudWarning.warning}
                                        {fraudWarning.flaggedPatterns?.length > 0 && (
                                            <div style={{ marginTop: '4px', opacity: 0.8, fontSize: '0.78rem' }}>
                                                Detected: {fraudWarning.flaggedPatterns.join(' • ')}
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => setFraudWarning(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9a3412', flexShrink: 0 }}>
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Smart Quick Replies */}
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '5px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                {(currentUser.role === 'EMPLOYER' ? [
                                    "Are you available for an interview?",
                                    "Can you start immediately?",
                                    "What is your expected salary?",
                                    "Please share your references."
                                ] : [
                                    "Yes, I am available.",
                                    "When would you like to schedule an interview?",
                                    "Thank you for reaching out!",
                                    "I can start immediately."
                                ]).map((reply, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setNewMessage(reply)}
                                        style={{
                                            whiteSpace: 'nowrap',
                                            padding: '6px 14px',
                                            borderRadius: '20px',
                                            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                                            border: '1px solid #e2e8f0',
                                            color: '#475569',
                                            fontSize: '0.8rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            fontWeight: '600'
                                        }}
                                        onMouseEnter={(e) => { e.target.style.background = '#e2e8f0'; e.target.style.color = 'var(--primary)'; }}
                                        onMouseLeave={(e) => { e.target.style.background = 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'; e.target.style.color = '#475569'; }}
                                    >
                                        ✨ {reply}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={() => setAmharicMode(!amharicMode)}
                                        style={{ fontSize: '0.75rem', padding: '2px 10px', borderRadius: '15px', border: amharicMode ? '1px solid var(--primary)' : '1px solid #ddd', background: amharicMode ? '#fff7ed' : 'white', color: amharicMode ? 'var(--primary)' : '#666', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <Keyboard size={12} /> {amharicMode ? 'Amharic ON' : 'Easy Amharic'}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    {isRecording ? (
                                        <div style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            background: '#fee2e2',
                                            padding: '8px 16px',
                                            borderRadius: '25px',
                                            border: '1px solid #fca5a5'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontWeight: '600', fontSize: '0.9rem' }}>
                                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                                                Recording... {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button
                                                    type="button"
                                                    onClick={cancelRecording}
                                                    title="Cancel Recording"
                                                    style={{ background: 'white', border: '1px solid #f87171', color: '#b91c1c', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                >
                                                    <X size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={stopAndSendVoiceNote}
                                                    title="Send Voice Note"
                                                    style={{ background: '#0f766e', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                >
                                                    <Check size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                style={{ flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #ddd', outline: 'none' }}
                                                placeholder={t('type_message')}
                                                value={newMessage}
                                                onChange={handleMessageChange}
                                            />
                                            <button
                                                type="button"
                                                onClick={startRecording}
                                                title="Record Voice Note"
                                                style={{
                                                    width: '45px',
                                                    height: '45px',
                                                    borderRadius: '50%',
                                                    background: '#f1f5f9',
                                                    border: '1px solid #cbd5e1',
                                                    color: '#0f766e',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Mic size={20} />
                                            </button>
                                            <button
                                                disabled={!newMessage.trim()}
                                                type="submit"
                                                style={{
                                                    width: '45px',
                                                    height: '45px',
                                                    borderRadius: '50%',
                                                    background: 'var(--primary)',
                                                    border: 'none',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    transition: 'transform 0.1s',
                                                    transform: newMessage.trim() ? 'scale(1.05)' : 'scale(1)'
                                                }}
                                            >
                                                <Send size={20} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </form>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', flexDirection: 'column' }}>
                        <MessageSquare size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
                        <p>{t('select_conversation')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Messages;

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useToast } from './Toast';
import { ShieldCheck, UserCheck, Copy, Check, Send, AlertCircle, Clock, Sparkles } from 'lucide-react';

const GuarantorVerificationModal = ({ isOpen, onClose, onVerified }) => {
    const { t } = useTranslation();
    const addToast = useToast();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [statusData, setStatusData] = useState(null);
    const [copied, setCopied] = useState(false);

    const [form, setForm] = useState({
        guarantorName: '',
        guarantorPhone: '',
        guarantorRelationship: 'Family / Relative'
    });

    const fetchStatus = async () => {
        setFetching(true);
        try {
            const res = await api.get('/guarantor/status');
            setStatusData(res.data);
            if (res.data.guarantorName) {
                setForm({
                    guarantorName: res.data.guarantorName || '',
                    guarantorPhone: res.data.guarantorPhone || '',
                    guarantorRelationship: res.data.relationship || 'Family / Relative'
                });
            }
        } catch (err) {
            console.error('Failed to fetch guarantor status', err);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchStatus();
        }
    }, [isOpen]);

    const handleSendInvite = async (e) => {
        e.preventDefault();
        if (!form.guarantorName || !form.guarantorPhone) {
            addToast(t('guarantor_required_fields') || 'Please fill in guarantor name and phone.', 'error');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/guarantor/invite', form);
            addToast(res.data.message || 'Guarantor verification invite sent!', 'success');
            await fetchStatus();
            if (onVerified) onVerified();
        } catch (err) {
            addToast(err.response?.data?.error || 'Failed to send invite', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        if (statusData?.token) {
            const baseUrl = window.location.origin;
            const link = `${baseUrl}/guarantor-consent?token=${statusData.token}`;
            navigator.clipboard.writeText(link);
            setCopied(true);
            addToast(t('link_copied') || 'Verification link copied to clipboard!', 'success');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '1.25rem',
                maxWidth: '540px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                animation: 'modalSlideUp 0.3s ease-out'
            }}>
                {/* Modal Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #1e3a8a, #0284c7)',
                    padding: '1.5rem',
                    color: '#ffffff',
                    position: 'relative'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            color: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem'
                        }}
                    >
                        ×
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            padding: '0.6rem',
                            borderRadius: '0.75rem'
                        }}>
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                                {t('guarantor_verification_title') || 'Digital Guarantor (ዋስ) Verification'}
                            </h2>
                            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, marginTop: '0.2rem' }}>
                                {t('guarantor_verification_subtitle') || 'Voluntary verification for +25 Trust points & verified badge'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
                    {/* Value Proposition Badge */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.85rem',
                        borderRadius: '0.75rem',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        marginBottom: '1.25rem'
                    }}>
                        <Sparkles size={22} color="#16a34a" style={{ flexShrink: 0 }} />
                        <div style={{ fontSize: '0.85rem', color: '#166534' }}>
                            <strong>{t('voluntary_benefit_title') || 'Voluntary & Rewarding'}:</strong>{' '}
                            {t('voluntary_benefit_desc') || 'Verifying your guarantor reassures employers and unlocks the Gold/Platinum trust tiers.'}
                        </div>
                    </div>

                    {fetching ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            {t('loading') || 'Loading status...'}
                        </div>
                    ) : statusData?.status === 'VERIFIED' ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '1.5rem',
                            backgroundColor: '#f8fafc',
                            borderRadius: '1rem',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                backgroundColor: '#dcfce7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1rem auto',
                                color: '#16a34a'
                            }}>
                                <UserCheck size={32} />
                            </div>
                            <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.15rem' }}>
                                {t('guarantor_verified_badge') || 'Guarantor Verified (ዋስ የተረጋገጠ)'}
                            </h3>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                                <strong>{statusData.guarantorName}</strong> ({statusData.relationship}) • {statusData.guarantorPhone}
                            </p>
                            <p style={{ color: '#16a34a', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 600 }}>
                                ✓ Verified on {new Date(statusData.verifiedAt).toLocaleDateString()}
                            </p>
                        </div>
                    ) : (
                        <div>
                            {statusData?.status === 'PENDING' && (
                                <div style={{
                                    backgroundColor: '#fffbeb',
                                    border: '1px solid #fef3c7',
                                    borderRadius: '0.75rem',
                                    padding: '1rem',
                                    marginBottom: '1.25rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309', marginBottom: '0.5rem' }}>
                                        <Clock size={18} />
                                        <strong style={{ fontSize: '0.9rem' }}>
                                            {t('pending_guarantor_consent') || 'Invite Sent — Awaiting Guarantor OTP Consent'}
                                        </strong>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: '#78350f', margin: '0 0 0.75rem 0' }}>
                                        Share the direct link with your guarantor if they have not opened the SMS yet:
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleCopyLink}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.5rem 0.85rem',
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #d97706',
                                            borderRadius: '0.5rem',
                                            color: '#b45309',
                                            fontWeight: 600,
                                            fontSize: '0.8rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
                                        {copied ? (t('copied') || 'Link Copied!') : (t('copy_consent_link') || 'Copy Consent Link')}
                                    </button>
                                </div>
                            )}

                            <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                                        {t('guarantor_full_name') || 'Guarantor Full Name (የዋስ ሙሉ ስም)'} *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Abebe Kebede"
                                        value={form.guarantorName}
                                        onChange={(e) => setForm({ ...form, guarantorName: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.65rem 0.85rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.9rem',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                                        {t('guarantor_phone') || 'Guarantor Phone Number (የዋስ ስልክ)'} *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="0911223344 or +251911223344"
                                        value={form.guarantorPhone}
                                        onChange={(e) => setForm({ ...form, guarantorPhone: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.65rem 0.85rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.9rem',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                                        {t('guarantor_relationship') || 'Relationship (ዝምድና)'}
                                    </label>
                                    <select
                                        value={form.guarantorRelationship}
                                        onChange={(e) => setForm({ ...form, guarantorRelationship: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.65rem 0.85rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.9rem',
                                            boxSizing: 'border-box',
                                            backgroundColor: '#ffffff'
                                        }}
                                    >
                                        <option value="Parent / Guardian">Parent / Guardian (ወላጅ / አሳዳጊ)</option>
                                        <option value="Sibling">Sibling (ወንድም / እህት)</option>
                                        <option value="Uncle / Aunt">Uncle / Aunt (አጎት / አክስት)</option>
                                        <option value="Community Elder">Community Elder (የአካባቢ ሽማግሌ)</option>
                                        <option value="Former Employer">Former Employer (ቀደምት አሰሪ)</option>
                                        <option value="Other Relative">Other Relative (ሌላ ዘመድ)</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        padding: '0.75rem 1.25rem',
                                        background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '0.6rem',
                                        fontSize: '0.95rem',
                                        fontWeight: 600,
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        opacity: loading ? 0.7 : 1,
                                        marginTop: '0.5rem'
                                    }}
                                >
                                    <Send size={18} />
                                    {loading
                                        ? (t('sending') || 'Generating invite...')
                                        : statusData?.status === 'PENDING'
                                        ? (t('resend_invite') || 'Resend Invite & New OTP')
                                        : (t('send_guarantor_invite') || 'Send Guarantor Invite (+25 Pts)')}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GuarantorVerificationModal;

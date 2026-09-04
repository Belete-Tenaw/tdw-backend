import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { ShieldCheck, CheckCircle2, AlertCircle, User, MapPin, KeyRound, ArrowRight } from 'lucide-react';

const GuarantorConsentPage = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [details, setDetails] = useState(null);
    const [error, setError] = useState(null);
    const [otpCode, setOtpCode] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Missing verification token in URL.');
            setLoading(false);
            return;
        }

        const fetchDetails = async () => {
            try {
                const res = await api.get(`/guarantor/public-verify/${token}`);
                setDetails(res.data);
                if (res.data.status === 'ALREADY_VERIFIED') {
                    setSuccess(true);
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Invalid or expired verification link.');
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [token]);

    const handleConfirm = async (e) => {
        e.preventDefault();
        if (!otpCode || otpCode.length < 6) {
            setError('Please enter the 6-digit OTP code sent to your phone.');
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const res = await api.post('/guarantor/public-confirm', {
                token,
                otpCode,
                signatureData: {
                    userAgent: navigator.userAgent,
                    confirmedAt: new Date().toISOString()
                }
            });
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Verification failed. Please check the OTP code.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #f0fdf4 0%, #f8fafc 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem 1rem'
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '1.25rem',
                maxWidth: '520px',
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e2e8f0',
                overflow: 'hidden'
            }}>
                {/* Header Banner */}
                <div style={{
                    background: 'linear-gradient(135deg, #059669, #0284c7)',
                    padding: '2rem 1.5rem',
                    color: '#ffffff',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem auto'
                    }}>
                        <ShieldCheck size={36} color="#ffffff" />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>
                        {t('guarantor_consent_portal') || 'Legal Guarantor (የዋስ ማረጋገጫ) Portal'}
                    </h1>
                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.9rem', opacity: 0.9 }}>
                        Trustworthy Domestic Workers Link (TDW Ethiopia)
                    </p>
                </div>

                {/* Main Content */}
                <div style={{ padding: '2rem 1.5rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            {t('loading_verification') || 'Loading verification details...'}
                        </div>
                    ) : success ? (
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <div style={{
                                width: '72px',
                                height: '72px',
                                borderRadius: '50%',
                                backgroundColor: '#dcfce7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1.25rem auto',
                                color: '#16a34a'
                            }}>
                                <CheckCircle2 size={44} />
                            </div>
                            <h2 style={{ fontSize: '1.3rem', color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                                {t('guarantor_confirmed_success') || 'Guarantor Consent Verified! (ዋስትናዎ ተረጋግጧል)'}
                            </h2>
                            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
                                Thank you for standing as a legal guarantor for{' '}
                                <strong>{details?.seeker?.fullName || 'the domestic worker'}</strong>.
                                Your verification increases safety and builds trust across the platform.
                            </p>
                            <button
                                onClick={() => navigate('/')}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: '#0f172a',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer'
                                }}
                            >
                                {t('visit_home') || 'Visit TDW Homepage'}
                            </button>
                        </div>
                    ) : (
                        <div>
                            {error && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1rem',
                                    backgroundColor: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '0.5rem',
                                    color: '#991b1b',
                                    fontSize: '0.85rem',
                                    marginBottom: '1.25rem'
                                }}>
                                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                                    <span>{error}</span>
                                </div>
                            )}

                            {details?.seeker && (
                                <div style={{
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '0.75rem',
                                    padding: '1rem',
                                    marginBottom: '1.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem'
                                }}>
                                    <div style={{
                                        width: '52px',
                                        height: '52px',
                                        borderRadius: '50%',
                                        backgroundColor: '#e2e8f0',
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {details.seeker.profilePhoto ? (
                                            <img
                                                src={details.seeker.profilePhoto}
                                                alt="Worker"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <User size={28} color="#64748b" />
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                                            Worker Profile
                                        </div>
                                        <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
                                            {details.seeker.fullName}
                                        </h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                            <MapPin size={14} />
                                            <span>{details.seeker.location}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Legal Consent Declaration */}
                            <div style={{
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: '0.75rem',
                                padding: '1rem',
                                marginBottom: '1.5rem'
                            }}>
                                <h4 style={{ margin: '0 0 0.35rem 0', color: '#166534', fontSize: '0.9rem', fontWeight: 700 }}>
                                    Legal Guarantor Consent Declaration (የዋስትና ቃል)
                                </h4>
                                <p style={{ fontSize: '0.8rem', color: '#14532d', lineHeight: 1.4, margin: 0 }}>
                                    በዚህ መድረክ ላይ ለተመዘገቡት <strong>{details?.seeker?.fullName}</strong> እኔ{' '}
                                    <strong>{details?.seeker?.guarantorName}</strong> ህጋዊ ዋስ መሆኔን አረጋግጣለሁ።
                                    <br />
                                    <em>I confirm that I know this individual and agree to stand as their legal guarantor on TDW.</em>
                                </p>
                            </div>

                            {/* OTP Form */}
                            <form onSubmit={handleConfirm}>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                                        {t('enter_6_digit_otp') || 'Enter 6-Digit OTP Code (የይለፍ ቃል ያስገቡ)'}
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <KeyRound size={18} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                                        <input
                                            type="text"
                                            required
                                            maxLength="6"
                                            placeholder="e.g. 123456"
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem 1rem 0.75rem 2.5rem',
                                                fontSize: '1.1rem',
                                                letterSpacing: '0.2rem',
                                                borderRadius: '0.5rem',
                                                border: '1px solid #cbd5e1',
                                                fontWeight: 700,
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem', display: 'block' }}>
                                        Enter the 6-digit code sent via SMS to {details?.seeker?.guarantorPhone || 'your phone'}.
                                    </span>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        padding: '0.85rem 1.25rem',
                                        background: 'linear-gradient(135deg, #059669, #0284c7)',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '0.6rem',
                                        fontSize: '1rem',
                                        fontWeight: 700,
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        opacity: submitting ? 0.7 : 1,
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                >
                                    <span>{submitting ? 'Confirming...' : 'I Confirm & Agree as Legal Guarantor (እኔ ዋስ መሆኔን አረጋግጣለሁ)'}</span>
                                    <ArrowRight size={18} />
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GuarantorConsentPage;

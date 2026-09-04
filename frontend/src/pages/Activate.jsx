import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Key, CheckCircle, XCircle, MessageSquare, LogIn } from 'lucide-react';
import debounce from 'lodash/debounce';

const Activate = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [validationStatus, setValidationStatus] = useState(null); // 'VALID', 'INVALID', 'EXPIRED', 'USED'

    // Debounced validation function
    const validateCode = useCallback(
        debounce(async (val) => {
            if (val.length < 5) {
                setValidationStatus(null);
                return;
            }

            setVerifying(true);
            setError('');
            try {
                const response = await api.get(`/payments/verify-code/${val}`);
                if (response.data.valid) {
                    setValidationStatus('VALID');
                } else {
                    setValidationStatus('INVALID');
                    setError(response.data.message || t('code_invalid_contact'));
                }
            } catch (err) {
                setValidationStatus('INVALID');
                setError(t('code_invalid_contact'));
            } finally {
                setVerifying(false);
            }
        }, 500),
        [t]
    );

    useEffect(() => {
        if (code) {
            validateCode(code);
        } else {
            setValidationStatus(null);
            setError('');
        }
    }, [code, validateCode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const response = await api.post('/payments/activate-code', { code });
            
            // Use the updated user object directly from the response
            if (response.data.user) {
                localStorage.setItem('user', JSON.stringify(response.data.user));
            } else {
                // Fallback: Fetch updated profile if backend didn't return it
                if (user?.role === 'EMPLOYER') {
                    const profileRes = await api.get(`/employers/${user.id}`);
                    localStorage.setItem('user', JSON.stringify({ ...user, tier: profileRes.data.tier, subscriptionExpiry: profileRes.data.subscriptionExpiry }));
                } else if (user?.role === 'JOB_SEEKER') {
                    const profileRes = await api.get(`/seekers/${user.id}`);
                    localStorage.setItem('user', JSON.stringify({ ...user, tier: profileRes.data.tier, badge: profileRes.data.badge, subscriptionExpiry: profileRes.data.subscriptionExpiry }));
                }
            }

            setSuccess(t('subscription_activated_success') || 'Subscription activated successfully!');
            setValidationStatus('VALID');
            setTimeout(() => {
                const role = user?.role;
                if (role === 'EMPLOYER') navigate('/dashboard/employer');
                else if (role === 'JOB_SEEKER') navigate('/dashboard/seeker');
                else navigate('/login');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.error || t('invalid_code'));
            setValidationStatus('INVALID');
        } finally {
            setLoading(false);
        }
    };

    const getSupportLink = () => {
        const message = encodeURIComponent(`Hello TDW Support, I am having trouble activating my code: ${code}. It shows as invalid.\n\n[ሰላም የTDW ድጋፍ ሰጪ ክፍል። ኮድ ለማስገባት ስሞክር እምቢ አለኝ። ኮዱ፡ ${code}]`);
        return `https://t.me/+251943194099?text=${message}`;
    };

    return (
        <div className="container" style={{ padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {/* Guest Nudge for Activation Page */}
            {!localStorage.getItem('token') && (
                <div style={{ 
                    background: '#fff9f5', 
                    padding: '20px 30px', 
                    borderRadius: '16px', 
                    marginBottom: '40px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    border: '1px solid #ffe8d9',
                    maxWidth: '450px',
                    width: '100%'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <LogIn size={24} color="var(--primary)" />
                        <div>
                            <h4 style={{ margin: 0, fontSize: '1rem' }}>{t('returning_user') || 'Already have an account?'}</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>{t('login_to_activate_desc') || 'Log in to apply this code to your profile.'}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate('/login?redirect=activate')}
                        className="btn-login"
                        style={{ padding: '10px 25px' }}
                    >
                        {t('login')}
                    </button>
                </div>
            )}

            <div className="card" style={{ maxWidth: '450px', width: '100%', textAlign: 'center', padding: '40px' }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: validationStatus === 'VALID' ? '#ecfdf5' : validationStatus === 'INVALID' ? '#fef2f2' : '#fff0e6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    transition: 'background 0.3s'
                }}>
                    {validationStatus === 'VALID' ? (
                        <CheckCircle size={30} color="#10b981" />
                    ) : validationStatus === 'INVALID' ? (
                        <XCircle size={30} color="#ef4444" />
                    ) : (
                        <Key size={30} color="var(--primary)" />
                    )}
                </div>

                <h2 style={{ marginBottom: '10px' }}>{t('enter_code')}</h2>
                <p style={{ color: '#666', marginBottom: '30px' }}>{t('premium_msg')}</p>

                <form onSubmit={handleSubmit}>
                    <div style={{ position: 'relative', marginBottom: '20px' }}>
                        <input
                            type="text"
                            placeholder="EDWL-XXXX-XXXX"
                            style={{
                                width: '100%',
                                padding: '20px',
                                borderRadius: '16px',
                                border: `3px solid ${validationStatus === 'VALID' ? '#10b981' : validationStatus === 'INVALID' ? '#ef4444' : '#e5e7eb'}`,
                                fontSize: '1.5rem',
                                textAlign: 'center',
                                textTransform: 'uppercase',
                                letterSpacing: '3px',
                                transition: 'all 0.3s ease',
                                outline: 'none',
                                background: validationStatus === 'VALID' ? '#f0fdf4' : validationStatus === 'INVALID' ? '#fef2f2' : 'white',
                                boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
                                fontWeight: 'bold',
                                fontFamily: 'monospace'
                            }}
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            required
                        />
                        {verifying && (
                            <div style={{
                                position: 'absolute',
                                right: '15px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '0.8rem',
                                color: '#999'
                            }}>
                                {t('verifying_code')}
                            </div>
                        )}
                    </div>

                    {validationStatus === 'VALID' && (
                        <div style={{ color: '#059669', marginBottom: '15px', fontSize: '0.9rem', fontWeight: '500' }}>
                            {t('code_valid')}
                        </div>
                    )}

                    {(error || validationStatus === 'INVALID') && (
                        <div style={{ 
                            marginBottom: '25px', 
                            padding: '20px', 
                            background: '#fef2f2', 
                            borderRadius: '16px',
                            border: '1px solid #fee2e2'
                        }}>
                            <div style={{ color: '#dc2626', marginBottom: '15px', fontSize: '0.95rem', fontWeight: '600' }}>
                                {error || t('code_invalid_contact')}
                            </div>
                            <a
                                href={getSupportLink()}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    background: '#ef4444',
                                    color: 'white',
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    textDecoration: 'none',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold',
                                    boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <MessageSquare size={18} />
                                {t('contact_support') || 'Contact Support via Telegram'}
                            </a>
                        </div>
                    )}

                    {success && <div style={{ color: '#059669', marginBottom: '15px', fontSize: '0.9rem', fontWeight: 'bold' }}>{success}</div>}

                    <button
                        type="submit"
                        className="btn-primary"
                        style={{
                            width: '100%',
                            padding: '15px',
                            background: validationStatus === 'VALID' ? 'var(--primary)' : '#9ca3af',
                            cursor: validationStatus === 'VALID' ? 'pointer' : 'not-allowed'
                        }}
                        disabled={loading || verifying || validationStatus !== 'VALID'}
                    >
                        {loading ? '...' : t('activate')}
                    </button>
                </form>

                <div style={{ marginTop: '30px', fontSize: '1rem', color: '#666', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                    <p>{t('need_code_msg') || 'Don\'t have a code yet?'}</p>
                    <a href="https://t.me/+251943194099" target="_blank" rel="noopener noreferrer" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#0088cc',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        marginTop: '10px'
                    }}>
                        <MessageSquare size={18} />
                        Get Code via Telegram
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Activate;

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, CheckCircle, Loader2 } from 'lucide-react';
import api from '../services/api';
import authService from '../services/authService';
import { useToast } from './Toast';
import { useTranslation } from 'react-i18next';

const SOSButton = () => {
    const { t } = useTranslation();
    const addToast = useToast();
    const [isTriggering, setIsTriggering] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const user = authService.getCurrentUser();

    if (!user) return null;

    const handleTrigger = async () => {
        setIsTriggering(true);
        try {
            let latitude = null;
            let longitude = null;

            // Try to get geolocation
            if ("geolocation" in navigator) {
                try {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                    });
                    latitude = position.coords.latitude;
                    longitude = position.coords.longitude;
                } catch (geoError) {
                    console.warn("Geolocation failed, proceeding without location:", geoError);
                }
            }

            await api.post('/safety/sos', {
                userId: user.id,
                userType: user.role,
                latitude,
                longitude
            });

            setIsConfirmed(true);
            setShowConfirm(false);
            addToast(t('sos_sent_success') || "SOS Alert sent! Help is on the way.", 'success');
            
            // Auto-reset after 10 seconds
            setTimeout(() => {
                setIsConfirmed(false);
            }, 10000);

        } catch (error) {
            addToast(error.response?.data?.error || 'Failed to send SOS alert', 'error');
        } finally {
            setIsTriggering(false);
        }
    };

    return (
        <div style={{ position: 'fixed', bottom: '25px', right: '25px', zIndex: 2000 }}>
            {showConfirm ? (
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '15px',
                    border: '2px solid #ef4444',
                    animation: 'slideUp 0.3s ease',
                    maxWidth: '300px'
                }}>
                    <div style={{ 
                        width: '50px', height: '50px', background: '#fee2e2', 
                        borderRadius: '50%', display: 'flex', alignItems: 'center', 
                        justifyContent: 'center', color: '#ef4444' 
                    }}>
                        <AlertTriangle size={30} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 5px', color: '#b91c1c', fontWeight: '800' }}>{t('trigger_sos_title') || 'Trigger Emergency Alert?'}</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{t('sos_confirm_desc') || 'This will alert TDW security and your emergency contacts immediately.'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                        <button 
                            onClick={() => setShowConfirm(false)}
                            style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer' }}
                        >
                            {t('cancel')}
                        </button>
                        <button 
                            onClick={handleTrigger}
                            disabled={isTriggering}
                            style={{ 
                                flex: 2, padding: '10px', borderRadius: '12px', border: 'none', 
                                background: '#ef4444', color: 'white', fontWeight: '700', 
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' 
                            }}
                        >
                            {isTriggering ? <Loader2 className="animate-spin" size={18} /> : <Shield size={18} />}
                            {t('send_alert') || 'SEND SOS'}
                        </button>
                    </div>
                </div>
            ) : isConfirmed ? (
                <div style={{
                    background: '#10b981',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '50px',
                    boxShadow: '0 10px 20px rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontWeight: '800',
                    animation: 'pulse 2s infinite'
                }}>
                    <CheckCircle size={20} />
                    {t('sos_active') || 'SOS SENT'}
                </div>
            ) : (
                <button
                    onClick={() => setShowConfirm(true)}
                    style={{
                        width: '65px',
                        height: '65px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 8px 30px rgba(239, 68, 68, 0.4)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
                    title={t('emergency_sos') || 'Emergency SOS'}
                >
                    <AlertTriangle size={32} />
                    <div className="sos-pulse" />
                </button>
            )}

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .sos-pulse {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background: rgba(239, 68, 68, 0.4);
                    border-radius: 50%;
                    animation: sosRipple 1.5s infinite;
                    z-index: -1;
                }
                @keyframes sosRipple {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default SOSButton;

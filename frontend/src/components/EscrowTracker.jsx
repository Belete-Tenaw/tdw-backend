import React, { useState } from 'react';
import { Shield, ArrowRight, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { useToast } from './Toast';

const EscrowTracker = ({ escrow, userRole, onUpdate }) => {
    const { t } = useTranslation();
    const addToast = useToast();
    const [releasing, setReleasing] = useState(false);

    const handleRelease = async () => {
        if (!window.confirm(t('confirm_escrow_release') || "CONFIRM RELEASE: This will pay the worker immediately. Only do this if the work is completed to your satisfaction.")) return;
        
        setReleasing(true);
        try {
            await api.put(`/escrow/${escrow.id}/release`);
            addToast(t('escrow_release_success') || "Funds released successfully!", 'success');
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error("Release error:", err);
            addToast(t('escrow_release_failed') || "Failed to release funds.", 'error');
        } finally {
            setReleasing(false);
        }
    };

    const isReleased = escrow.status === 'RELEASED_TO_SEEKER';

    return (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: isReleased ? '#f0fdf4' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isReleased ? '#10b981' : '#f59e0b' }}>
                        <Shield size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Secure Escrow</div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{escrow.amount} ETB</div>
                    </div>
                </div>
                <div style={{ 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    background: isReleased ? '#dcfce7' : '#ffedd5', 
                    color: isReleased ? '#166534' : '#9a3412',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    border: `1px solid ${isReleased ? '#bbf7d0' : '#fed7aa'}`
                }}>
                    {escrow.status.replace(/_/g, ' ')}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: '#f8fafc', borderRadius: '12px' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>From Employer</div>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{escrow.employer?.contactName}</div>
                </div>
                <ArrowRight size={16} color="#94a3b8" />
                <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>To Worker</div>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{escrow.jobSeeker?.fullName}</div>
                </div>
            </div>

            {userRole === 'employer' && !isReleased && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: '#eff6ff', padding: '10px', borderRadius: '8px' }}>
                        <Info size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <p style={{ fontSize: '0.75rem', color: '#1e40af', margin: 0 }}>
                            Funds are safely held by TDW. Release them only after the job is done.
                        </p>
                    </div>
                    <button 
                        onClick={handleRelease}
                        disabled={releasing}
                        className="btn-primary"
                        style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        {releasing ? 'RELEASING...' : 'RELEASE PAYMENT'}
                    </button>
                </div>
            )}

            {isReleased && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 'bold', fontSize: '0.9rem', justifyContent: 'center' }}>
                    <CheckCircle2 size={18} /> Payment Released Successfully
                </div>
            )}

            {userRole === 'seeker' && !isReleased && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 'bold', fontSize: '0.9rem', justifyContent: 'center', background: '#fffbeb', padding: '12px', borderRadius: '8px' }}>
                    <AlertCircle size={18} /> Payment held in secure escrow
                </div>
            )}
        </div>
    );
};

export default EscrowTracker;

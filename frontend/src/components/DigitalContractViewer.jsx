import React, { useState, useEffect } from 'react';
import { FileText, Check, Clock, AlertTriangle, ShieldCheck, Star, MapPin, Printer, ArrowRight, Play, Square, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import ReviewForm from './ReviewForm';
import { useToast } from './Toast';
import ContractDocumentModal from './ContractDocumentModal';

const DigitalContractViewer = ({ contract, userRole, onUpdate }) => {
    const { t, i18n } = useTranslation();
    const isAmharic = i18n.language === 'am';
    const addToast = useToast();

    const [signing, setSigning] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [showDocModal, setShowDocModal] = useState(false);

    // Attendance & Shift Tracking
    const [activeShift, setActiveShift] = useState(null);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [advancingMilestone, setAdvancingMilestone] = useState(false);

    const isContractActive = contract.status === 'ACTIVE';
    const isPendingSignature = contract.status === 'PENDING_SIGNATURE' || contract.status === 'PENDING_SEEKER_SIGNATURE';

    // Fetch shift status for active contracts
    useEffect(() => {
        if (!isContractActive) return;

        api.get(`/attendance/status/${contract.id}`)
            .then(res => {
                if (res.data?.isActive && res.data?.shift) {
                    setActiveShift(res.data.shift);
                } else {
                    setActiveShift(null);
                }
            })
            .catch(err => console.error("Error checking shift status:", err));
    }, [contract.id, isContractActive]);

    const handleSign = async () => {
        if (!window.confirm(t('confirm_sign_contract') || "By clicking confirm, you are digitally signing this contract and agreeing to all terms and conditions.")) return;
        
        setSigning(true);
        try {
            await api.put(`/contracts/${contract.id}/sign`);
            addToast(t('contract_signed_success') || "Contract signed successfully!", 'success');
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error("Signing error:", err);
            addToast(t('contract_sign_failed') || "Failed to sign contract.", 'error');
        } finally {
            setSigning(false);
        }
    };

    // Geolocation Clock-In
    const handleClockIn = () => {
        setAttendanceLoading(true);
        if (!navigator.geolocation) {
            addToast(isAmharic ? 'የቦታ መረጃ (GPS) በመሳሪያዎ አይደገፍም' : 'Geolocation is not supported by your browser.', 'error');
            setAttendanceLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const res = await api.post('/attendance/check-in', {
                        contractId: contract.id,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                    setActiveShift(res.data.shift);
                    addToast(isAmharic ? 'ስራ በተሳካ ሁኔታ ተጀምሯል! ጂፒኤስ ተረጋግጧል' : 'Clocked in successfully! GPS location verified.', 'success');
                } catch (err) {
                    console.error("Clock-in error:", err);
                    addToast(err.response?.data?.error || 'Failed to clock in.', 'error');
                } finally {
                    setAttendanceLoading(false);
                }
            },
            (error) => {
                console.error("GPS error:", error);
                addToast(isAmharic ? 'እባክዎ የጂፒኤስ ፍቃድ ይስጡ' : 'Please allow GPS location access to clock in.', 'error');
                setAttendanceLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Geolocation Clock-Out
    const handleClockOut = () => {
        setAttendanceLoading(true);
        const sendClockOut = async (lat, lon) => {
            try {
                const res = await api.post('/attendance/check-out', {
                    contractId: contract.id,
                    latitude: lat,
                    longitude: lon
                });
                setActiveShift(null);
                addToast(res.data.message || (isAmharic ? 'ስራ በተሳካ ሁኔታ ተጠናቋል' : 'Clocked out successfully.'), 'success');
            } catch (err) {
                console.error("Clock-out error:", err);
                addToast(err.response?.data?.error || 'Failed to clock out.', 'error');
            } finally {
                setAttendanceLoading(false);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => sendClockOut(pos.coords.latitude, pos.coords.longitude),
                () => sendClockOut(null, null),
                { timeout: 8000 }
            );
        } else {
            sendClockOut(null, null);
        }
    };

    // Advance Milestone
    const handleAdvanceMilestone = async (target) => {
        if (!window.confirm(`Are you sure you want to advance escrow milestone to ${target}?`)) return;
        setAdvancingMilestone(true);
        try {
            await api.put(`/contracts/${contract.id}/milestone`, { targetMilestone: target });
            addToast(`Milestone updated to ${target}!`, 'success');
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error("Advance milestone error:", err);
            addToast(err.response?.data?.error || 'Failed to advance milestone.', 'error');
        } finally {
            setAdvancingMilestone(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return '#10b981';
            case 'ACTIVE': return '#10b981';
            case 'SIGNED_BY_SEEKER': return '#3b82f6';
            case 'PENDING_SIGNATURE':
            case 'PENDING_SEEKER_SIGNATURE': return '#f59e0b';
            case 'DISPUTED': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const milestone = contract.milestoneStatus || 'TRIAL_PERIOD';

    return (
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)' }}>
            {/* Header */}
            <div style={{ background: '#f8fafc', padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', color: '#2563eb' }}>
                        <FileText size={22} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>{contract.jobPost?.title || 'Employment Contract'}</h3>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>ID: {contract.id.substring(0, 8)}...</div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => setShowDocModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '10px', fontSize: '0.8rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: '600', cursor: 'pointer' }}
                    >
                        <Printer size={15} /> {isAmharic ? 'ውል እይ' : 'View Agreement'}
                    </button>
                    <div style={{ 
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        background: `${getStatusColor(contract.status)}15`, 
                        color: getStatusColor(contract.status),
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        border: `1px solid ${getStatusColor(contract.status)}30`
                    }}>
                        {contract.status.replace(/_/g, ' ')}
                    </div>
                </div>
            </div>

            <div style={{ padding: '25px' }}>
                {/* Employer & Worker Cards */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '25px' }}>
                    <div style={{ flex: '1 1 250px', padding: '15px', background: '#f0fdf4', borderRadius: '14px', border: '1px solid #dcfce7' }}>
                        <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Employer</div>
                        <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#0f172a' }}>{contract.employer?.contactName}</div>
                        <div style={{ fontSize: '0.85rem', color: '#166534' }}>{contract.employer?.phone}</div>
                    </div>
                    <div style={{ flex: '1 1 250px', padding: '15px', background: '#eff6ff', borderRadius: '14px', border: '1px solid #dbeafe' }}>
                        <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Worker</div>
                        <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#0f172a' }}>{contract.jobSeeker?.fullName}</div>
                        <div style={{ fontSize: '0.85rem', color: '#1e40af' }}>{contract.jobSeeker?.phone}</div>
                    </div>
                </div>

                {/* Key Details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '25px', background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Salary / Wage</div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.15rem', color: '#2563eb' }}>{contract.salaryAmount || contract.salary} ETB</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Start Date</div>
                        <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{new Date(contract.startDate).toLocaleDateString()}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Job Type</div>
                        <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{contract.jobType || 'Domestic Support'}</div>
                    </div>
                </div>

                {/* Terms Summary */}
                <div style={{ marginBottom: '25px' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldCheck size={16} color="#2563eb" /> Terms & Labor Protections
                    </h4>
                    <div style={{ background: '#fafafa', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', lineHeight: '1.6', color: '#475569', border: '1px solid #e2e8f0', maxHeight: '120px', overflowY: 'auto' }}>
                        {contract.termsConditions || "Protected under FDRE labor regulations and TDW Escrow Milestone Engine."}
                    </div>
                </div>

                {/* ━━━ ACTIVE CONTRACT ACTIONS: ATTENDANCE & MILESTONES ━━━ */}
                {isContractActive && (
                    <div style={{ marginTop: '20px', padding: '18px', background: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MapPin size={18} color="#16a34a" />
                                <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#166534' }}>
                                    {isAmharic ? 'የስራ ፈረቃ እና ጂፒኤስ ክትትል' : 'Geo-Fenced Shift Attendance'}
                                </span>
                            </div>

                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                padding: '4px 10px', 
                                borderRadius: '12px', 
                                background: activeShift ? '#dcfce7' : '#f1f5f9', 
                                color: activeShift ? '#15803d' : '#64748b',
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                            }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeShift ? '#22c55e' : '#94a3b8' }}></span>
                                {activeShift ? (isAmharic ? 'በስራ ላይ (Clocked In)' : 'Currently on Shift') : (isAmharic ? 'ስራ ላይ አይደሉም' : 'Off Shift')}
                            </div>
                        </div>

                        {/* Seeker Clock In / Out Controls */}
                        {userRole === 'seeker' && (
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {!activeShift ? (
                                    <button
                                        onClick={handleClockIn}
                                        disabled={attendanceLoading}
                                        style={{ flex: 1, padding: '10px 16px', borderRadius: '10px', background: '#16a34a', color: 'white', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                                    >
                                        {attendanceLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                        {isAmharic ? 'ስራ ጀምር (Clock In)' : 'Start Shift (Clock In)'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleClockOut}
                                        disabled={attendanceLoading}
                                        style={{ flex: 1, padding: '10px 16px', borderRadius: '10px', background: '#dc2626', color: 'white', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                                    >
                                        {attendanceLoading ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />}
                                        {isAmharic ? 'ስራ ጨርስ (Clock Out)' : 'End Shift (Clock Out)'}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Employer Milestone Advancement Control */}
                        {userRole === 'employer' && (
                            <div style={{ borderTop: '1px solid #bbf7d0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.8rem', color: '#166534' }}>
                                    Current Milestone: <strong>{milestone.replace(/_/g, ' ')}</strong>
                                </div>
                                {milestone === 'TRIAL_PERIOD' && (
                                    <button
                                        onClick={() => handleAdvanceMilestone('TRIAL_RELEASED')}
                                        disabled={advancingMilestone}
                                        style={{ padding: '6px 14px', borderRadius: '8px', background: '#2563eb', color: 'white', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        {advancingMilestone ? 'Updating...' : 'Approve Trial & Release Escrow'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Signing Prompt for Seeker */}
                {userRole === 'seeker' && isPendingSignature && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                        <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <p style={{ fontSize: '0.8rem', color: '#92400e', margin: 0 }}>
                                {isAmharic ? 'እባክዎ ውሉን በጥንቃቄ ይመልከቱ። አንዴ ከፈረሙ በሁለቱም ወገን በህግ የፀና ይሆናል።' : 'Please review all terms carefully. Once signed, this contract is legally binding between you and the employer.'}
                            </p>
                        </div>
                        <button 
                            onClick={handleSign}
                            disabled={signing}
                            className="btn-primary" 
                            style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#2563eb', color: 'white', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                        >
                            {signing ? 'SIGNING...' : <><Check size={18} /> {isAmharic ? 'በዲጂታል ፊርማ አረጋግጥ' : 'SIGN DIGITALLY'}</>}
                        </button>
                    </div>
                )}

                {/* Completed Contract Review Form */}
                {contract.status === 'COMPLETED' && (
                    <div style={{ marginTop: '20px' }}>
                        {!showReview ? (
                            <button 
                                onClick={() => setShowReview(true)}
                                style={{ width: '100%', padding: '12px', background: 'white', border: '2px solid #2563eb', color: '#2563eb', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <Star size={18} /> LEAVE A REVIEW
                            </button>
                        ) : (
                            <ReviewForm 
                                targetId={userRole === 'employer' ? contract.jobSeekerId : contract.employerId}
                                targetType={userRole === 'employer' ? 'seeker' : 'employer'}
                                contractId={contract.id}
                                onSuccess={() => {
                                    setShowReview(false);
                                    if (onUpdate) onUpdate();
                                }}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Printable Document Modal */}
            <ContractDocumentModal
                isOpen={showDocModal}
                onClose={() => setShowDocModal(false)}
                contractId={contract.id}
            />
        </div>
    );
};

export default DigitalContractViewer;

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import authService from '../../services/authService';
import { User, MapPin, Briefcase, Plus, Star, Settings, Shield, UserPlus, Copy, Check, Activity, Search, Award, Sparkles } from 'lucide-react';
import JobPostModal from '../../components/JobPostModal';
import WorkerProfileModal from '../../components/WorkerProfileModal';
import DigitalContractViewer from '../../components/DigitalContractViewer';
import EscrowTracker from '../../components/EscrowTracker';
import CandidateComparisonModal from '../../components/CandidateComparisonModal';
import { FileText, Columns } from 'lucide-react';
import SmartSearchWizard from '../../components/SmartSearchWizard';
import SOSFloatingButton from '../../components/SOSFloatingButton';
import SmartMatchBadge from '../../components/SmartMatchBadge';
import MicroInsuranceModal from '../../components/MicroInsuranceModal';
import AIMatchMatrixModal from '../../components/AIMatchMatrixModal';
import HouseholdChecklistModal from '../../components/HouseholdChecklistModal';

const EmployerDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [workers, setWorkers] = useState([]);
    const [user, setUser] = useState(authService.getCurrentUser());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [aiMatrixCandidate, setAiMatrixCandidate] = useState(null);
    const [myJobs, setMyJobs] = useState([]);
    const [showInsuranceModal, setShowInsuranceModal] = useState(false);
    const [selectedWorkerForInsurance, setSelectedWorkerForInsurance] = useState(null);
    const [selectedContractForChecklist, setSelectedContractForChecklist] = useState(null);
    const [showChecklistModal, setShowChecklistModal] = useState(false);

    const [selectedJobForMatches, setSelectedJobForMatches] = useState(null);
    const [matches, setMatches] = useState([]);
    const [copied, setCopied] = useState(false);
    const [premiumCode, setPremiumCode] = useState('');
    const [redeemStatus, setRedeemStatus] = useState({ loading: false, error: null, success: null });
    const [pendingVerification, setPendingVerification] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLocation, setFilterLocation] = useState('');
    const [activeTab, setActiveTab] = useState('workers'); // 'workers', 'agreements', 'escrow'
    const [contracts, setContracts] = useState([]);
    const [escrows, setEscrows] = useState([]);
    const [compareList, setCompareList] = useState([]);
    const [showComparison, setShowComparison] = useState(false);
    const [showJobModal, setShowJobModal] = useState(false);

    const handleCopyCode = () => {
        if (user?.referralCode) {
            navigator.clipboard.writeText(user.referralCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [workersRes, jobsRes, profileRes, contractsRes, escrowRes] = await Promise.all([
                    api.get('/seekers'),
                    api.get('/employers/me/jobs'),
                    api.get(`/employers/${user.id}`),
                    api.get('/contracts'),
                    api.get('/escrow')
                ]);
                setWorkers(workersRes.data);
                setMyJobs(jobsRes.data || []);
                setContracts(contractsRes.data || []);
                setEscrows(escrowRes.data || []);
                if (profileRes.data.verificationStatus === 'PENDING') {
                    setPendingVerification(true);
                }
            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
                setError(t('failed_to_load_data') || 'Failed to load data. Please refresh.');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const fetchMatches = async (jobId) => {
        setLoading(true);
        try {
            const res = await api.get(`/jobs/${jobId}/matches`);
            setMatches(res.data);
            setSelectedJobForMatches(jobId);
        } catch (err) {
            console.error("Match error:", err);
            setError(t('matching_failed'));
        } finally {
            setLoading(false);
        }
    };

    const handleJobPosted = (newJob) => {
        alert(t('job_posted_success') || 'Job posted successfully!');
        setShowJobModal(false);
    };

    const handleRedeemCode = async () => {
        if (!premiumCode.trim()) return;
        setRedeemStatus({ loading: true, error: null, success: null });
        try {
            const res = await api.post('/employers/redeem-code', { code: premiumCode });
            setRedeemStatus({ loading: false, error: null, success: res.data.message });
            setPremiumCode('');
            // Update local user state
            const updatedUser = { ...user, tier: res.data.employer.tier, subscriptionExpiry: res.data.employer.subscriptionExpiry };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));

            // Clear success message after 5 seconds
            setTimeout(() => setRedeemStatus(prev => ({ ...prev, success: null })), 5000);
        } catch (err) {
            console.error("Redeem error:", err);
            setRedeemStatus({ loading: false, error: err.response?.data?.error || 'Failed to redeem code', success: null });
        }
    };

    const toggleCompare = (worker) => {
        if (compareList.find(c => (c.id || c.seeker_id) === (worker.id || worker.seeker_id))) {
            setCompareList(compareList.filter(c => (c.id || c.seeker_id) !== (worker.id || worker.seeker_id)));
        } else {
            if (compareList.length >= 3) {
                alert("You can compare up to 3 candidates at once.");
                return;
            }
            setCompareList([...compareList, worker]);
        }
    };

    const displayedWorkers = selectedJobForMatches ? matches : workers;
    
    const filteredWorkers = displayedWorkers.filter(worker => {
        const matchesSearch = (worker.fullName || worker.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                              ((worker.skills || []).join(' ')).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLocation = filterLocation ? (worker.preferredLocation === filterLocation) : true;
        return matchesSearch && matchesLocation;
    });

    const uniqueLocations = [...new Set(displayedWorkers.map(w => w.preferredLocation).filter(Boolean))];

    return (
        <div className="container" style={{ padding: '40px 20px' }}>
            <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>{t('dashboard')}</h1>
                    <p style={{ color: '#666' }}>{t('manage_jobs_msg')}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Link to="/profile/edit" style={{ textDecoration: 'none' }}>
                        <button style={{ height: '44px', padding: '0 15px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', color: '#666', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <Settings size={20} /> {t('edit_profile')}
                        </button>
                    </Link>
                    <button className="btn-primary" onClick={() => setShowJobModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={20} /> {t('post_job')}
                    </button>
                    {compareList.length > 1 && (
                        <button 
                            className="btn-primary" 
                            onClick={() => setShowComparison(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--navy)' }}
                        >
                            <Columns size={20} /> Compare ({compareList.length})
                        </button>
                    )}
                </div>
            </header>

            {showJobModal && (
                <JobPostModal
                    onClose={() => setShowJobModal(false)}
                    onJobPosted={handleJobPosted}
                />
            )}

            {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>{error}</div>}

            {/* Subscription Days Remaining Badge */}
            {user?.subscriptionExpiry && user?.tier !== 'FREE' && (
                <div style={{ 
                    background: 'rgba(59, 130, 246, 0.05)', 
                    border: '1px solid #e2e8f0', 
                    padding: '12px 20px', 
                    borderRadius: '12px', 
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                }}>
                    <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '10px', 
                        background: 'white', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        color: 'var(--primary)'
                    }}>
                        <Shield size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>
                            {user.tier.replace('_ACCESS', '')} {t('subscription') || 'Subscription'}
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#1e293b' }}>
                            {Math.ceil((new Date(user.subscriptionExpiry) - new Date()) / (1000 * 60 * 60 * 24)) > 0 ? (
                                <span>
                                    {Math.ceil((new Date(user.subscriptionExpiry) - new Date()) / (1000 * 60 * 60 * 24))} {t('days_remaining') || 'days remaining'}
                                </span>
                            ) : (
                                <span style={{ color: '#ef4444' }}>{t('expired') || 'Expired'}</span>
                            )}
                        </div>
                    </div>
                    {Math.ceil((new Date(user.subscriptionExpiry) - new Date()) / (1000 * 60 * 60 * 24)) < 7 && (
                        <button 
                            onClick={() => navigate('/pricing')}
                            style={{ marginLeft: 'auto', padding: '6px 15px', borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                        >
                            {t('renew_now') || 'Renew Now'}
                        </button>
                    )}
                </div>
            )}

            {/* Tier Status Alert */}
            {user?.tier === 'FREE' && !pendingVerification && (
                <div style={{ background: 'linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid #f59e0b', padding: '15px', borderRadius: '12px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h4 style={{ color: '#92400e', marginBottom: '5px' }}>✨ {t('upgrade_cta_title') || 'Unlock Elite Workers'}</h4>
                        <p style={{ color: '#b45309', fontSize: '0.9rem', margin: 0 }}>{t('upgrade_cta_msg') || 'Platinum and Gold workers are hidden from Free accounts. Upgrade to Platinum Access to see the best matches.'}</p>
                    </div>
                    <button className="btn-primary" onClick={() => navigate('/pricing')}>{t('see_plans')}</button>
                </div>
            )}
            {pendingVerification && (
                <div style={{ background: '#eff6ff', padding: '15px 25px', borderRadius: '12px', border: '1px solid #3b82f6', marginBottom: '30px' }}>
                    <p style={{ color: '#1e40af', fontWeight: 'bold', marginBottom: '5px' }}>⏳ {t('verification_pending_title') || 'Verification in Progress'}</p>
                    <p style={{ color: '#60a5fa', fontSize: '0.85rem', margin: 0 }}>{t('verification_pending_msg') || 'Our admins are reviewing your documents/receipt. This usually takes 2-4 hours.'}</p>
                </div>
            )}

            {/* Referral Promo Banner */}
            {user?.tier !== 'GOLD' && user?.tier !== 'PLATINUM' && (
                <div style={{
                    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    marginBottom: '30px',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'white' }}>🚀 {t('get_gold_free') || 'Get GOLD Status for FREE!'}</h2>
                        <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.9)', maxWidth: '450px' }}>
                            {t('refer_bonus_desc_employer') || 'Refer 3 other employers to join EDWL and we’ll upgrade your account to Gold for 7 days.'}
                        </p>
                    </div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <button 
                            onClick={handleCopyCode}
                            style={{ 
                                padding: '12px 24px', 
                                background: 'white', 
                                color: '#2563eb', 
                                borderRadius: '10px', 
                                fontWeight: 'bold', 
                                border: 'none', 
                                cursor: 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                            }}
                        >
                            {copied ? (t('copied') || 'Copied!') : (t('copy_referral_code') || 'Copy Referral Code')}
                        </button>
                    </div>
                    {/* Decorative background shape */}
                    <div style={{ position: 'absolute', right: '-50px', top: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}></div>
                </div>
            )}


            {/* Concierge Section (Wave 2) */}
            <div style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <div style={{ padding: '8px', background: 'var(--navy)', borderRadius: '10px', color: 'white' }}>
                        <Sparkles size={20} />
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>Concierge Picks</h2>
                    <span style={{ fontSize: '0.75rem', background: '#f59e0b', color: 'white', padding: '2px 10px', borderRadius: '20px', fontWeight: '800' }}>PREMIUM AI</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    {[1,2,3].map(i => (
                        <div key={i} className="card glass-hover" style={{ padding: '20px', border: '1px solid #bae6fd', background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)' }}>
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#eee' }}></div>
                                <div>
                                    <h4 style={{ margin: 0, fontWeight: '800' }}>Top Candidate #{i}</h4>
                                    <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
                                        {[1,2,3,4,5].map(s => <Star key={s} size={12} fill="#f59e0b" color="#f59e0b" />)}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '700', marginTop: '5px' }}>98% AI Match Score</div>
                                </div>
                            </div>
                            <button className="btn-secondary" style={{ width: '100%', fontSize: '0.85rem' }}>View Exclusive Analysis</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <button 
                    onClick={() => setActiveTab('workers')} 
                    style={{ background: 'none', border: 'none', padding: '10px 20px', fontSize: '1rem', fontWeight: activeTab === 'workers' ? 'bold' : 'normal', color: activeTab === 'workers' ? 'var(--primary)' : '#666', borderBottom: activeTab === 'workers' ? '3px solid var(--primary)' : 'none', cursor: 'pointer' }}
                >
                    {t('workers_matches') || 'Workers & Matches'}
                </button>
                <button 
                    onClick={() => setActiveTab('agreements')} 
                    style={{ background: 'none', border: 'none', padding: '10px 20px', fontSize: '1rem', fontWeight: activeTab === 'agreements' ? 'bold' : 'normal', color: activeTab === 'agreements' ? 'var(--primary)' : '#666', borderBottom: activeTab === 'agreements' ? '3px solid var(--primary)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <FileText size={18} /> {t('agreements') || 'Digital Contracts'}
                </button>
                <button 
                    onClick={() => setActiveTab('escrow')} 
                    style={{ background: 'none', border: 'none', padding: '10px 20px', fontSize: '1rem', fontWeight: activeTab === 'escrow' ? 'bold' : 'normal', color: activeTab === 'escrow' ? 'var(--primary)' : '#666', borderBottom: activeTab === 'escrow' ? '3px solid var(--primary)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Shield size={18} /> {t('escrow_payments') || 'Escrow Tracking'}
                </button>
            </div>

            {activeTab === 'workers' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '30px' }}>
                    <aside>
                        <h3 style={{ marginBottom: '20px' }}>{t('my_job_posts') || 'My Job Posts'}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {myJobs.map(job => (
                                <div key={job.id} onClick={() => fetchMatches(job.id)} style={{
                                    padding: '15px',
                                    background: selectedJobForMatches === job.id ? '#f0f7ff' : 'white',
                                    border: selectedJobForMatches === job.id ? '2px solid var(--primary)' : '1px solid #ddd',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}>
                                    <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>{job.title}</h4>
                                    <span style={{ fontSize: '0.8rem', color: '#666' }}>{job.address}</span>
                                </div>
                            ))}
                        </div>

                        {/* Referral Card */}
                        <div className="card" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1px solid #bbf7d0', marginTop: '30px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <UserPlus size={20} color="#15803d" />
                                <h3 style={{ fontSize: '1rem', color: '#166534', margin: 0 }}>{t('referral_program') || 'Referral Program'}</h3>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#166534', marginBottom: '15px' }}>
                                {t('referral_bonus_msg')}
                            </p>

                            <div style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px dashed #22c55e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontWeight: 'bold', letterSpacing: '1px', color: '#111' }}>{user?.referralCode || 'NOT_FOUND'}</span>
                                <button
                                    onClick={handleCopyCode}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#15803d', display: 'flex', alignItems: 'center' }}
                                >
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>

                            <div style={{ fontSize: '0.75rem', color: '#166534' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span>{t('successful_referrals') || 'Invites'}:</span>
                                    <span style={{ fontWeight: 'bold' }}>{user?.referralCount || 0} / 3</span>
                                </div>
                                <div style={{ height: '6px', background: 'rgba(21, 128, 61, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${Math.min(((user?.referralCount || 0) / 3) * 100, 100)}%`, height: '100%', background: '#22c55e' }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Redeem Premium Code Card */}
                        <div className="card" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: '1px solid #cbd5e1', marginTop: '30px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <Shield size={20} color="#0f172a" />
                                <h3 style={{ fontSize: '1rem', color: '#0f172a', margin: 0 }}>Redeem Premium Code</h3>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '15px' }}>
                                Enter your activation code to unlock Platinum/Gold access or extend your subscription time.
                            </p>

                            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                <input
                                    type="text"
                                    placeholder="e.g. PLAT-X9Y2"
                                    value={premiumCode}
                                    onChange={(e) => setPremiumCode(e.target.value.toUpperCase())}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', textTransform: 'uppercase' }}
                                />
                                <button
                                    onClick={handleRedeemCode}
                                    disabled={redeemStatus.loading || !premiumCode.trim()}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        background: premiumCode.trim() ? '#0f172a' : '#94a3b8',
                                        color: 'white',
                                        border: 'none',
                                        cursor: premiumCode.trim() ? 'pointer' : 'not-allowed',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {redeemStatus.loading ? 'Redeeming...' : 'Apply Code'}
                                </button>
                            </div>

                            {redeemStatus.error && (
                                <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '10px', background: '#fef2f2', padding: '8px', borderRadius: '6px' }}>{redeemStatus.error}</p>
                            )}
                            {redeemStatus.success && (
                                <p style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '10px', background: '#ecfdf5', padding: '8px', borderRadius: '6px' }}>{redeemStatus.success}</p>
                            )}
                        </div>
                    </aside>

                    <main>
                        {/* Dynamic Match Radar */}
                        <div style={{
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                            borderRadius: '16px',
                            padding: '20px',
                            marginBottom: '25px',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0 }}>
                                {/* Radar pulse animation */}
                                <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(56, 189, 248, 0.5)', borderRadius: '50%', animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}></div>
                                <div style={{ position: 'absolute', inset: '10px', background: '#38bdf8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Activity size={24} color="white" />
                                </div>
                                <style>{`@keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }`}</style>
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Live AI Radar <span style={{ background: '#10b981', color: 'white', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Scanning</span>
                                </h3>
                                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
                                    Actively scanning {filterLocation || 'all regions'}... Found <strong style={{ color: '#38bdf8' }}>{filteredWorkers.length}</strong> high-probability matches ready for hire.
                                </p>
                            </div>
                        </div>

                        <h3 style={{ marginBottom: '20px' }}>
                            {selectedJobForMatches ? `${t('matches_for') || 'Matches for'} "${myJobs.find(j => j.id === selectedJobForMatches)?.title}"` : t('all_workers') || 'Available Workers'}
                        </h3>

                        <SmartSearchWizard
                            locations={uniqueLocations}
                            onComplete={(filters) => {
                                setSearchTerm(filters.skill || '');
                                setFilterLocation(filters.location || '');
                            }}
                        />

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                                <input
                                    type="text"
                                    placeholder={t('search_workers', 'Search workers by name or role...')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px', border: '1px solid #ddd' }}
                                />
                            </div>
                            <select
                                value={filterLocation}
                                onChange={(e) => setFilterLocation(e.target.value)}
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: 'white' }}
                            >
                                <option value="">{t('all_locations', 'All Locations')}</option>
                                {uniqueLocations.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                        </div>

                        {loading ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f0f0f0' }}></div>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ height: '16px', background: '#f0f0f0', borderRadius: '4px', width: '70%' }}></div>
                                                <div style={{ height: '12px', background: '#f0f0f0', borderRadius: '4px', width: '50%' }}></div>
                                            </div>
                                        </div>
                                        <div style={{ height: '12px', background: '#f0f0f0', borderRadius: '4px', width: '90%' }}></div>
                                        <div style={{ height: '12px', background: '#f0f0f0', borderRadius: '4px', width: '80%' }}></div>
                                        <div style={{ height: '36px', background: '#f0f0f0', borderRadius: '8px', width: '100%', marginTop: '10px' }}></div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredWorkers.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '50px 20px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                                <Search size={48} color="#9ca3af" style={{ margin: '0 auto 15px auto', display: 'block' }} />
                                <h3 style={{ fontSize: '1.2rem', color: '#374151', marginBottom: '8px' }}>{t('no_matches_found', 'No matches found')}</h3>
                                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{t('try_adjusting_filters', 'Try adjusting your search or filters to find more candidates.')}</p>
                                {(searchTerm || filterLocation) && (
                                    <button
                                        onClick={() => { setSearchTerm(''); setFilterLocation(''); }}
                                        style={{ marginTop: '15px', padding: '8px 16px', background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', color: '#4b5563' }}
                                    >
                                        {t('clear_filters', 'Clear filters')}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                {filteredWorkers.map(worker => (
                                <div key={worker.id || worker.seeker_id} className="card" style={{ 
                                    opacity: worker.is_visible === false ? 0.6 : 1,
                                    border: compareList.find(c => c.id === worker.id) ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                                    position: 'relative'
                                }}>
                                    {worker.is_visible !== false && (
                                        <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 10 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-light)' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={!!compareList.find(c => c.id === worker.id)}
                                                    onChange={() => toggleCompare(worker)}
                                                />
                                                Compare
                                            </label>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', filter: worker.is_visible === false ? 'blur(4px)' : 'none' }}>
                                            {worker.profilePhoto ? (
                                                <img src={worker.profilePhoto} alt={worker.fullName || worker.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <User size={28} color="#666" />
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{worker.is_visible === false ? 'Hidden Profile' : (worker.fullName || worker.full_name)}</h3>
                                                {(worker.badge === 'PLATINUM' || worker.tier === 'PLATINUM' || worker.display_tier === 'PLATINUM') && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                                        <Shield size={10} fill="white" /> PLATINUM
                                                    </div>
                                                )}
                                                {worker.behaviorScore >= 90 && (
                                                    <div title="High Reliability / Fast Response" style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                                        <Award size={10} fill="white" /> ELITE
                                                    </div>
                                                )}
                                                {(worker.nationalIdUrl || worker.national_id_url) && (
                                                    <div title="Fayda ID Verified" style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #bbf7d0' }}>
                                                        <Check size={10} /> FAYDA
                                                    </div>
                                                )}
                                                {(worker.policeClearanceUrl || worker.police_clearance_url) && (
                                                    <div title="Police Clearance Verified" style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#f0f9ff', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #bae6fd' }}>
                                                        <Activity size={10} /> POLICE
                                                    </div>
                                                )}
                                                {worker.match_score > 0 ? (
                                                    <SmartMatchBadge 
                                                        compatibilityScore={worker.match_score} 
                                                        isStrongMatch={worker.match_score >= 75} 
                                                        breakdown={worker.breakdown} 
                                                        seekerName={worker.fullName || worker.full_name} 
                                                    />
                                                ) : (
                                                    <SmartMatchBadge 
                                                        compatibilityScore={worker.compatibilityScore || 85} 
                                                        isStrongMatch={true} 
                                                        breakdown={worker.breakdown} 
                                                        seekerName={worker.fullName || worker.full_name} 
                                                    />
                                                )}
                                                {(worker.isFeatured || worker.s_featured > 0) && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff7ed', color: '#c2410c', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #ffedd5' }}>
                                                        ⭐ {t('featured') || 'Featured'}
                                                    </div>
                                                )}
                                            </div>
                                            <span style={{ fontSize: '0.85rem', color: '#666' }}>{worker.age} {t('years_old')} • {worker.gender === 'FEMALE' ? t('female') : t('male')}</span>
                                        </div>
                                    </div>

                                    {/* Smart Insights Section */}
                                    {worker.matchInsights && worker.matchInsights.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '15px' }}>
                                            {worker.matchInsights.map(insight => (
                                                <span key={insight} style={{ 
                                                    fontSize: '0.7rem', 
                                                    background: 'var(--primary-glow)', 
                                                    color: 'var(--primary)', 
                                                    padding: '2px 8px', 
                                                    borderRadius: '6px',
                                                    fontWeight: '700',
                                                    border: '1px solid hsla(180, 100%, 25%, 0.1)'
                                                }}>
                                                    ✨ {insight}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {worker.is_visible === false ? (
                                        <div style={{ textAlign: 'center', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
                                            <Shield size={30} color="#f59e0b" style={{ marginBottom: '10px' }} />
                                            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>Upgrade to Platinum to unlock this candidate.</p>
                                            <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => navigate('/pricing')}>Upgrade</button>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ marginBottom: '15px', color: '#555', fontSize: '0.9rem' }}>
                                                {worker.match_score && (
                                                    <div style={{ marginBottom: '8px', color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <Star size={16} fill="var(--primary)" /> {worker.match_score} Skills Match
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                                                    <Briefcase size={16} /> {worker.experienceYears} {t('years_exp')}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <MapPin size={16} /> {worker.preferredLocation}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                <button onClick={() => setSelectedWorker(worker)} style={{ flex: 1, padding: '10px', border: '1px solid #ddd', background: 'transparent', borderRadius: '8px', fontWeight: '500', color: 'var(--text)', cursor: 'pointer' }}>
                                                    {t('view_profile')}
                                                </button>
                                                <button
                                                    onClick={() => setAiMatrixCandidate(worker)}
                                                    style={{ flex: 1, padding: '10px', border: 'none', background: 'linear-gradient(135deg, var(--primary) 0%, #006666 100%)', color: 'white', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                                                    title={t('ai_match_matrix_title')}
                                                >
                                                    <Sparkles size={14} /> AI Match
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            </div>
                        )}
                    </main>
                </div>
            ) : activeTab === 'agreements' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '30px' }}>
                    {contracts.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px' }}>
                            <FileText size={48} color="#ccc" style={{ margin: '0 auto 15px' }} />
                            <h3>No contracts found</h3>
                            <p>Hire workers to create digital contracts.</p>
                        </div>
                    ) : (
                        contracts.map(contract => (
                            <div key={contract.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <DigitalContractViewer 
                                    contract={contract} 
                                    userRole="employer" 
                                    onUpdate={fetchDashboardData}
                                />
                                <button
                                    onClick={() => {
                                        setSelectedContractForChecklist(contract.id);
                                        setShowChecklistModal(true);
                                    }}
                                    style={{
                                        padding: '10px 16px',
                                        backgroundColor: '#0f766e',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontWeight: '700',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    📦 {t('household_checklist_btn') || 'Household Handover Checklist'}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '30px' }}>
                    {escrows.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px' }}>
                            <Shield size={48} color="#ccc" style={{ margin: '0 auto 15px' }} />
                            <h3>No escrow records</h3>
                            <p>Escrow starts after a contract is signed.</p>
                        </div>
                    ) : (
                        escrows.map(escrow => (
                            <EscrowTracker 
                                key={escrow.id} 
                                escrow={escrow} 
                                userRole="employer" 
                                onUpdate={fetchDashboardData}
                            />
                        ))
                    )}
                </div>
            )}

            {
                selectedWorker && (
                    <WorkerProfileModal
                        worker={selectedWorker}
                        onClose={() => setSelectedWorker(null)}
                    />
                )
            }

            {showComparison && (
                <CandidateComparisonModal 
                    candidates={compareList} 
                    onClose={() => setShowComparison(false)} 
                />
            )}

            <MicroInsuranceModal
                isOpen={showInsuranceModal}
                onClose={() => setShowInsuranceModal(false)}
                workerId={selectedWorkerForInsurance?.id || 'worker-1'}
                workerName={selectedWorkerForInsurance?.fullName || selectedWorkerForInsurance?.full_name || 'Worker'}
            />

            <AIMatchMatrixModal
                isOpen={Boolean(aiMatrixCandidate)}
                candidate={aiMatrixCandidate}
                onClose={() => setAiMatrixCandidate(null)}
                onConnect={(cand) => setSelectedWorker(cand)}
            />

            <HouseholdChecklistModal
                isOpen={showChecklistModal}
                onClose={() => setShowChecklistModal(false)}
                contractId={selectedContractForChecklist}
                userRole="EMPLOYER"
            />
            
            <SOSFloatingButton />
        </div >
    );
};

export default EmployerDashboard;
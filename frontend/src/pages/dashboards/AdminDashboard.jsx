import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api, { API_BASE_URL } from '../../services/api';
import { Users, Briefcase, CreditCard, Shield, AlertTriangle, FileText, Activity, Camera, MapPin } from 'lucide-react';
import PremiumCodeFactory from '../admin/PremiumCodeFactory';
import AdminInsights from './AdminInsights';
import GeographicHeatmapModal from '../../components/GeographicHeatmapModal';

// Helper function to get full document URL
const getDocumentUrl = (path) => {
    // Handle null, undefined, empty string, or string literals 'undefined'/'null'
    if (!path || path === 'undefined' || path === 'null' || path.trim() === '') return null;
    if (path.startsWith('http')) return path; // Already a full URL

    // Ensure path doesn't result in double slashes if API_BASE_URL ends with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${cleanPath}`;
};

const AdminDashboard = () => {
    const { t } = useTranslation();
    const [users, setUsers] = useState({ seekers: [], employers: [] });
    const [reports, setReports] = useState([]);
    const [generatedCode, setGeneratedCode] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('verification'); // verification, reports, codes, pulse, insights
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED, BLOCKED
    const [stats, setStats] = useState(null);
    const [days, setDays] = useState(30);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [fraudReport, setFraudReport] = useState(null);

    const fetchFraudAudit = async () => {
        try {
            const res = await api.get('/admin/fraud-audit');
            setFraudReport(res.data);
        } catch (err) {
            console.error('Failed to fetch fraud audit', err);
        }
    };

    const fetchData = async () => {
        try {
            const [usersRes, reportsRes, statsRes] = await Promise.all([
                api.get('/admin/users'),
                api.get('/reports'),
                api.get('/admin/stats')
            ]);
            setUsers({
                seekers: usersRes.data?.seekers || [],
                employers: usersRes.data?.employers || []
            });
            setReports(reportsRes.data || []);
            setStats(statsRes.data);
        } catch (err) {
            console.error("Failed to fetch admin data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleVerify = async (id, type, status, badge) => {
        try {
            await api.post('/admin/verify', { id, type, status, badge });
            alert(`User ${status.toLowerCase()} successfully!`);
            fetchData();
        } catch (err) {
            alert('Failed to update verification status');
        }
    };

    const handleGenerate = async () => {
        try {
            const res = await api.post('/admin/generate-code', { days: parseInt(days) });
            setGeneratedCode(res.data);
        } catch (err) {
            alert(t('failed_to_generate_code') || 'Failed to generate code');
        }
    };

    const handleStatusChange = async (user, action) => {
        try {
            await api.post('/admin/status', { id: user.id, type: user.type, action });
            alert(action === 'ACTIVATE' ? t('user_activated') : t('user_blocked'));
            fetchData();
        } catch (err) {
            alert('Failed to update user status');
        }
    };

    const handleDeleteUser = async (user) => {
        if (!window.confirm(t('confirm_delete_user'))) return;
        try {
            await api.delete(`/admin/user/${user.type}/${user.id}`);
            alert('User profile deleted successfully!');
            fetchData();
        } catch (err) {
            alert('Failed to delete user');
        }
    };

    const getTimeSince = (date) => {
        if (!date) return null;
        const diff = new Date() - new Date(date);
        const mins = Math.floor(diff / (1000 * 60));
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        return `${Math.floor(hours / 24)}d`;
    };

    if (loading) return <div className="container" style={{ padding: '40px 20px' }}>{t('loading')}</div>;

    return (
        <div className="container" style={{ padding: '40px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ color: 'var(--primary)', margin: 0 }}>{t('admin_dashboard')}</h2>
                <div style={{ display: 'flex', gap: '10px', background: '#f0f0f0', padding: '5px', borderRadius: '10px' }}>
                    <button onClick={() => setActiveTab('verification')} style={{ padding: '8px 15px', borderRadius: '8px', border: 'none', background: activeTab === 'verification' ? 'white' : 'transparent', fontWeight: '500', cursor: 'pointer' }}>{t('verification')}</button>
                    <button onClick={() => setActiveTab('reports')} style={{ padding: '8px 15px', borderRadius: '8px', border: 'none', background: activeTab === 'reports' ? 'white' : 'transparent', fontWeight: '500', cursor: 'pointer' }}>{t('reports')}</button>
                    <button onClick={() => setActiveTab('pulse')} style={{ padding: '8px 15px', borderRadius: '8px', border: 'none', background: activeTab === 'pulse' ? 'white' : 'transparent', fontWeight: '500', cursor: 'pointer' }}>📊 Pulse</button>
                    <button onClick={() => setActiveTab('insights')} style={{ padding: '8px 15px', borderRadius: '8px', border: 'none', background: activeTab === 'insights' ? 'white' : 'transparent', fontWeight: '500', cursor: 'pointer' }}>📈 Insights</button>
                    <button onClick={() => setActiveTab('codes')} style={{ padding: '8px 15px', borderRadius: '8px', border: 'none', background: activeTab === 'codes' ? 'white' : 'transparent', fontWeight: '500', cursor: 'pointer' }}>{t('codes')}</button>
                    <button onClick={() => { setActiveTab('fraud'); fetchFraudAudit(); }} style={{ padding: '8px 15px', borderRadius: '8px', border: 'none', background: activeTab === 'fraud' ? 'white' : 'transparent', fontWeight: '500', cursor: 'pointer', color: activeTab === 'fraud' ? '#dc2626' : '#475569' }}>🛡️ Fraud Audit</button>
                    <button onClick={() => setShowHeatmap(true)} style={{ padding: '8px 15px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14}/> Map</button>
                </div>
            </div>

            {activeTab === 'verification' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>{t('user_management')}</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'BLOCKED'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: '20px',
                                        border: '1px solid #ddd',
                                        background: statusFilter === s ? 'var(--primary)' : 'white',
                                        color: statusFilter === s ? 'white' : '#666',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {t(s.toLowerCase())}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '20px' }}>
                        {[...users.seekers.map(s => ({ ...s, type: 'seeker' })), ...users.employers.map(e => ({ ...e, type: 'employer', fullName: e.contactName }))]
                            .filter(u => {
                                if (statusFilter === 'ALL') return true;
                                if (statusFilter === 'BLOCKED') return !u.isActive;
                                if (statusFilter === 'PENDING') return u.verificationStatus === 'PENDING' || u.verificationStatus === 'NOT_STARTED';
                                return u.verificationStatus === statusFilter && u.isActive;
                            })
                            .map(user => {
                                const lastRequest = user.verificationRequests?.[0];
                                const waitTimeHours = lastRequest ? (new Date() - new Date(lastRequest.submittedAt)) / (1000 * 60 * 60) : 0;
                                const isUrgent = waitTimeHours > 2;

                                return (
                                    <div key={user.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: user.type === 'seeker' ? '4px solid #f97316' : '4px solid #3b82f6', borderTop: isUrgent && user.verificationStatus === 'PENDING' ? '3px solid #ef4444' : 'none' }}>
                                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                            <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', background: '#eee', flexShrink: 0 }}>
                                                {/* FIXED: Check for 'undefined' string before rendering image */}
                                                {user.profilePhoto && user.profilePhoto !== 'undefined' && user.profilePhoto !== 'null' ? (
                                                    <img
                                                        src={user.profilePhoto.startsWith('http') ? user.profilePhoto : `${API_BASE_URL}${user.profilePhoto}`}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        alt="Profile"
                                                    />
                                                ) : (
                                                    <Users size={40} style={{ margin: '20px' }} color="#ccc" />
                                                )}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <h4 style={{ margin: '0' }}>{user.fullName}</h4>
                                                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: user.type === 'seeker' ? '#fff7ed' : '#eff6ff', color: user.type === 'seeker' ? '#c2410c' : '#1d4ed8', fontWeight: 'bold', textTransform: 'uppercase' }}>{user.type}</span>
                                                    {lastRequest && user.verificationStatus === 'PENDING' && (
                                                        <span style={{ fontSize: '0.7rem', color: isUrgent ? '#ef4444' : '#666', background: isUrgent ? '#fee2e2' : '#f3f4f6', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                                                            🕒 {isUrgent ? 'OVERDUE: ' : ''}{getTimeSince(lastRequest.submittedAt)}
                                                        </span>
                                                    )}
                                                </div>
                                                <p style={{ fontSize: '0.9rem', color: '#666', margin: '5px 0' }}>{user.phone} • {user.email}</p>

                                                <div style={{ display: 'flex', gap: '15px', marginTop: '10px', flexWrap: 'wrap' }}>

                                                    {/* FIXED: Check for 'undefined' string before rendering ID Link */}
                                                    {user.idDocument && user.idDocument !== 'undefined' && user.idDocument !== 'null' ? (
                                                        <a href={getDocumentUrl(user.idDocument)} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                            <Shield size={14} /> {t('view_id_document')}
                                                        </a>
                                                    ) : (
                                                        <span style={{ fontSize: '0.85rem', color: '#999' }}>{t('no_id_uploaded')}</span>
                                                    )}

                                                    {user.liveSelfieUrl && user.liveSelfieUrl !== 'undefined' && user.liveSelfieUrl !== 'null' && (
                                                        <a href={getDocumentUrl(user.liveSelfieUrl)} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#ec4899', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                            <Camera size={14} /> {t('live_selfie_match') || 'Live Selfie Match'}
                                                        </a>
                                                    )}

                                                    {/* FIXED: Check for 'undefined' string before rendering Police Link */}
                                                    {user.policeClearanceUrl && user.policeClearanceUrl !== 'undefined' && user.policeClearanceUrl !== 'null' && (
                                                        <a href={getDocumentUrl(user.policeClearanceUrl)} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                            <FileText size={14} /> {t('police_clearance')}
                                                        </a>
                                                    )}

                                                    {/* FIXED: Check for 'undefined' string before rendering Health Link */}
                                                    {user.healthCertificateUrl && user.healthCertificateUrl !== 'undefined' && user.healthCertificateUrl !== 'null' && (
                                                        <a href={getDocumentUrl(user.healthCertificateUrl)} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                            <Activity size={14} /> {t('health_certificate')}
                                                        </a>
                                                    )}
                                                    {user.nationalIdUrl && user.nationalIdUrl !== 'undefined' && user.nationalIdUrl !== 'null' && (
                                                        <a href={getDocumentUrl(user.nationalIdUrl)} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                            <Shield size={14} /> {t('national_id_fayda')}
                                                        </a>
                                                    )}
                                                    {user.guarantorIdUrl && user.guarantorIdUrl !== 'undefined' && user.guarantorIdUrl !== 'null' && (
                                                        <a href={getDocumentUrl(user.guarantorIdUrl)} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#8b5cf6', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                            <Users size={14} /> {t('guarantor_id')}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    background: !user.isActive ? '#fee2e2' : user.verificationStatus === 'APPROVED' ? '#dcfce7' : '#fef9c3',
                                                    color: !user.isActive ? '#b91c1c' : user.verificationStatus === 'APPROVED' ? '#15803d' : '#854d0e',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {!user.isActive ? t('blocked') : t(user.verificationStatus.toLowerCase())}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button
                                                    onClick={() => handleDeleteUser(user)}
                                                    style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fee2e2', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                                >
                                                    {t('delete_profile')}
                                                </button>
                                                {user.isActive ? (
                                                    <button
                                                        onClick={() => handleStatusChange(user, 'SUSPEND')}
                                                        style={{ background: '#fef2f2', color: '#b91c1c', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    >
                                                        {t('block')}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleStatusChange(user, 'ACTIVATE')}
                                                        style={{ background: '#ecfdf5', color: '#059669', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    >
                                                        {t('unblock')}
                                                    </button>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                {user.type === 'seeker' && user.verificationStatus !== 'APPROVED' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#666' }}>{t('level_to_grant')}:</span>
                                                        <select
                                                            id={`badge-select-${user.id}`}
                                                            defaultValue="SILVER"
                                                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.85rem' }}
                                                        >
                                                            <option value="SILVER">{t('silver')}</option>
                                                            <option value="GOLD">{t('gold')}</option>
                                                            <option value="PLATINUM">{t('platinum')}</option>
                                                        </select>
                                                    </div>
                                                )}

                                                {user.verificationStatus !== 'APPROVED' && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                const badge = user.type === 'seeker' ? document.getElementById(`badge-select-${user.id}`).value : undefined;
                                                                handleVerify(user.id, user.type, 'APPROVED', badge);
                                                            }}
                                                            style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                                        >
                                                            {t('approve')}
                                                        </button>
                                                        <button
                                                            onClick={() => handleVerify(user.id, user.type, 'REJECTED')}
                                                            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                                        >
                                                            {t('reject')}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        {[...users.seekers, ...users.employers].length === 0 && <p>{t('no_pending_verifications')}</p>}
                    </div>
                </div>
            )}

            {activeTab === 'reports' && (
                <div>
                    <h3 style={{ marginBottom: '20px' }}>{t('safety_reports')}</h3>
                    <div style={{ display: 'grid', gap: '20px' }}>
                        {reports.length === 0 ? (
                            <p>{t('no_reports_found')}</p>
                        ) : (
                            reports.map(report => (
                                <div key={report.id} className="card" style={{ borderLeft: '4px solid #ef4444' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#ef4444', textTransform: 'uppercase' }}>{t('reported_user')}</span>
                                            <h4 style={{ margin: '0' }}>{report.reportedJS?.fullName || report.reportedEmp?.contactName || 'Unknown'} ({report.reportedJS ? t('seeker') : t('employer')})</h4>
                                            <p style={{ margin: '5px 0', fontSize: '0.85rem', color: '#666' }}>ID: {report.reportedJSId || report.reportedEmpId}</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>{t('reporter')}</span>
                                            <p style={{ margin: '0', fontSize: '0.9rem' }}>{report.reporterJS?.fullName || report.reporterEmp?.contactName || 'Unknown'}</p>
                                            <p style={{ margin: '0', fontSize: '0.75rem', color: '#999' }}>{new Date(report.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div style={{ background: '#fff5f5', padding: '15px', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                                        <strong>{t('reason')}:</strong> {report.reason}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'pulse' && stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    <div className="card" style={{ borderTop: stats.metrics.verificationVelocity > 2 ? '4px solid #ef4444' : '4px solid #10b981' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h4 style={{ margin: 0 }}>Verification Velocity</h4>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: stats.metrics.verificationVelocity > 2 ? '#ef4444' : '#10b981' }}>
                                {stats.metrics.verificationVelocity}h
                            </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#666' }}>Avg. time to approve seekers. <br />Target: &lt; 2 hours</p>
                    </div>

                    <div className="card" style={{ borderTop: '4px solid #f97316' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h4 style={{ margin: 0 }}>Supply Seeding (Alpha)</h4>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.metrics.seedingProgress} / 50</span>
                        </div>
                        <div style={{ height: '10px', background: '#fee2e2', borderRadius: '5px', overflow: 'hidden', marginBottom: '10px' }}>
                            <div style={{ height: '100%', background: '#f97316', width: `${Math.min((stats.metrics.seedingProgress / 50) * 100, 100)}%` }}></div>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#666' }}>Target for Meri Hub launch: 50 approved workers.</p>
                    </div>

                    <div className="card" style={{ borderTop: '4px solid #3b82f6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h4 style={{ margin: 0 }}>Liquidity Ratio</h4>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>{stats.metrics.liquidityRatio}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#666' }}>Job Posts per approved worker. Ideal: 0.5 - 2.0</p>
                    </div>

                    <div className="card" style={{ borderTop: '4px solid #8b5cf6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h4 style={{ margin: 0 }}>conversion_rate</h4>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6' }}>{stats.metrics.conversionRate}%</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#666' }}>Percentage of employers on premium tiers.</p>
                    </div>

                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <h4 style={{ margin: '0 0 15px 0' }}>📍 Demand Heatmap (By Woreda/Sub-City)</h4>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                                        <th style={{ padding: '10px' }}>Location (Woreda)</th>
                                        <th style={{ padding: '10px' }}>Jobs (Demand)</th>
                                        <th style={{ padding: '10px' }}>Workers (Supply)</th>
                                        <th style={{ padding: '10px' }}>Shortage</th>
                                        <th style={{ padding: '10px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.metrics.heatmap.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                            <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.woreda}</td>
                                            <td style={{ padding: '10px' }}>{item.demand}</td>
                                            <td style={{ padding: '10px' }}>{item.supply}</td>
                                            <td style={{ padding: '10px' }}>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '10px',
                                                    background: item.shortage > 5 ? '#fee2e2' : '#f0fdf4',
                                                    color: item.shortage > 5 ? '#ef4444' : '#10b981',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {item.shortage > 0 ? `+${item.shortage}` : item.shortage}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                {item.shortage > 0 && (
                                                    <span style={{ fontSize: '0.75rem', color: '#f97316', fontWeight: 'bold' }}>📢 Needs Scouts</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {stats.metrics.heatmap.length === 0 && (
                                        <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No location data available yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card" style={{ gridColumn: '1 / -1', background: '#0f172a', color: 'white', border: 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h4 style={{ margin: 0, opacity: 0.8, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Revenue (Life-to-Date)</h4>
                                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10b981' }}>{stats.metrics.revenue.total.toLocaleString()} ETB</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                    <Activity size={14} /> {((stats.metrics.revenue.automated / stats.metrics.revenue.total) * 100 || 0).toFixed(1)}% Automated
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '5px' }}>Automated (Chapa/Telebirr)</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.metrics.revenue.automated.toLocaleString()} ETB</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '5px' }}>Manual (CBE/Cash)</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.metrics.revenue.manual.toLocaleString()} ETB</div>
                            </div>
                        </div>

                        <div style={{ height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                            <div style={{ width: `${(stats.metrics.revenue.automated / stats.metrics.revenue.total) * 100 || 0}%`, background: '#10b981', height: '100%' }}></div>
                            <div style={{ width: `${(stats.metrics.revenue.manual / stats.metrics.revenue.total) * 100 || 0}%`, background: '#64748b', height: '100%' }}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '8px', opacity: 0.5 }}>
                            <span>Automation Target: 90%</span>
                            <span>Scale Focus: Job Seeker Premium Growth</span>
                        </div>
                    </div>

                    <div className="card" style={{ gridColumn: '1 / -1', background: 'var(--primary)', color: 'white' }}>
                        <h4 style={{ margin: '0 0 10px 0' }}>Marketplace Summary</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.counts.seekers}</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Total Seekers ({stats.counts.approvedSeekers} Verif.)</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.counts.employers}</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Total Employers ({stats.counts.premiumEmployers} Prem.)</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.counts.jobs}</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Active Job Posts</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'insights' && (
                <AdminInsights />
            )}

            {activeTab === 'codes' && (
                <PremiumCodeFactory />
            )}

            {activeTab === 'fraud' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertTriangle color="#ef4444" /> AI Fraud & Anomaly Audit Guard
                                </h3>
                                <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                                    Automated multi-vector risk analysis evaluating Fayda duplicate IDs, velocity, and safety reports.
                                </p>
                            </div>
                            <div style={{ padding: '12px 20px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fca5a5' }}>
                                    {fraudReport?.highRiskCount || 0}
                                </div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#cbd5e1' }}>Flagged Accounts</div>
                            </div>
                        </div>
                    </div>

                    {(!fraudReport || !fraudReport.accounts || fraudReport.accounts.length === 0) ? (
                        <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                            ✅ No high-risk accounts detected. All active profiles are clear.
                        </div>
                    ) : (
                        fraudReport.accounts.map((acc, idx) => (
                            <div key={idx} className="card" style={{ borderLeft: acc.riskLevel === 'HIGH' ? '5px solid #ef4444' : '5px solid #f59e0b' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <h4 style={{ margin: 0 }}>{acc.fullName || acc.contactName}</h4>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', background: acc.riskLevel === 'HIGH' ? '#fee2e2' : '#fef3c7', color: acc.riskLevel === 'HIGH' ? '#991b1b' : '#92400e' }}>
                                                {acc.riskLevel} RISK ({acc.riskScore}/100)
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>📞 {acc.phone}</span>
                                        </div>

                                        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {acc.flags.map((flag, fIdx) => (
                                                <span key={fIdx} style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', fontWeight: '600' }}>
                                                    ⚠️ {flag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleStatusChange({ id: acc.userId, type: acc.userType === 'JOB_SEEKER' ? 'seeker' : 'employer' }, 'BLOCK')}
                                        style={{ padding: '8px 16px', borderRadius: '8px', background: '#dc2626', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        Suspend Account
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <GeographicHeatmapModal 
                isOpen={showHeatmap} 
                onClose={() => setShowHeatmap(false)} 

            />
        </div>
    );
};

export default AdminDashboard;
import React, { useState, useEffect } from 'react';
import {
    Users,
    UserPlus,
    UploadCloud,
    CheckCircle,
    Clock,
    Briefcase,
    Shield,
    Search,
    Filter,
    Copy,
    Check,
    RefreshCw,
    Award,
    AlertCircle,
    X,
    FileSpreadsheet,
    DollarSign,
    PhoneCall,
    MapPin
} from 'lucide-react';
import api from '../../services/api';
import authService from '../../services/authService';

export default function AgencyDashboard() {
    const [stats, setStats] = useState(null);
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [skillFilter, setSkillFilter] = useState('ALL');
    const [copiedCode, setCopiedCode] = useState(false);

    // Modal states
    const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
    const [isBulkOpen, setIsBulkOpen] = useState(false);

    // Single worker form
    const [workerForm, setWorkerForm] = useState({
        fullName: '',
        phone: '',
        skills: 'Housekeeper',
        experienceYears: 2,
        expectedSalary: 6000,
        preferredLocation: 'Addis Ababa',
        preferredArrangement: 'LIVE_IN',
        gender: 'FEMALE',
        age: 24,
        bio: ''
    });
    const [savingWorker, setSavingWorker] = useState(false);
    const [singleError, setSingleError] = useState('');
    const [singleSuccess, setSingleSuccess] = useState('');

    // Bulk upload state
    const [bulkData, setBulkData] = useState('');
    const [uploadingBulk, setUploadingBulk] = useState(false);
    const [bulkResult, setBulkResult] = useState(null);
    const [bulkError, setBulkError] = useState('');

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const [statsRes, workersRes] = await Promise.all([
                api.get('/agency/dashboard'),
                api.get('/agency/workers')
            ]);
            setStats(statsRes.data);
            setWorkers(workersRes.data.workers || []);
        } catch (err) {
            console.error('Failed to load agency dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyReferralCode = () => {
        if (stats?.agency?.referralCode) {
            navigator.clipboard.writeText(stats.agency.referralCode);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2500);
        }
    };

    const handleAddWorker = async (e) => {
        e.preventDefault();
        setSavingWorker(true);
        setSingleError('');
        setSingleSuccess('');

        try {
            const res = await api.post('/agency/workers', {
                ...workerForm,
                skills: workerForm.skills.split(',').map(s => s.trim())
            });

            setSingleSuccess(`Worker ${res.data.worker.fullName} added successfully! Temporary Password: ${res.data.worker.tempPassword}`);
            setWorkerForm({
                fullName: '',
                phone: '',
                skills: 'Housekeeper',
                experienceYears: 2,
                expectedSalary: 6000,
                preferredLocation: 'Addis Ababa',
                preferredArrangement: 'LIVE_IN',
                gender: 'FEMALE',
                age: 24,
                bio: ''
            });
            loadDashboardData();
        } catch (err) {
            setSingleError(err.response?.data?.error || 'Failed to add worker.');
        } finally {
            setSavingWorker(false);
        }
    };

    const handleBulkUpload = async (e) => {
        e.preventDefault();
        setUploadingBulk(true);
        setBulkError('');
        setBulkResult(null);

        try {
            let parsedWorkers = [];
            // Try parsing JSON first
            if (bulkData.trim().startsWith('[') || bulkData.trim().startsWith('{')) {
                const parsed = JSON.parse(bulkData);
                parsedWorkers = Array.isArray(parsed) ? parsed : [parsed];
            } else {
                // Parse CSV format (fullName, phone, skills, experienceYears, expectedSalary, preferredLocation)
                const lines = bulkData.trim().split('\n');
                parsedWorkers = lines.map(line => {
                    const [fullName, phone, skills, experienceYears, expectedSalary, preferredLocation] = line.split(',').map(s => s.trim());
                    return {
                        fullName,
                        phone,
                        skills: skills ? skills.split(';') : ['Housekeeper'],
                        experienceYears: experienceYears ? parseInt(experienceYears, 10) : 2,
                        expectedSalary: expectedSalary ? parseInt(expectedSalary, 10) : 6000,
                        preferredLocation: preferredLocation || 'Addis Ababa'
                    };
                }).filter(w => w.fullName);
            }

            if (parsedWorkers.length === 0) {
                throw new Error('No valid worker entries detected in input.');
            }

            const res = await api.post('/agency/workers/bulk', { workers: parsedWorkers });
            setBulkResult(res.data.results);
            setBulkData('');
            loadDashboardData();
        } catch (err) {
            setBulkError(err.message || err.response?.data?.error || 'Failed to bulk-import workers.');
        } finally {
            setUploadingBulk(false);
        }
    };

    const handleToggleStatus = async (workerId, currentStatus) => {
        const nextStatus = currentStatus === 'AVAILABLE' ? 'PLACED' : 'AVAILABLE';
        try {
            await api.put(`/agency/workers/${workerId}/status`, { status: nextStatus });
            setWorkers(prev => prev.map(w => {
                if (w.id === workerId) {
                    return { ...w, availability: { status: nextStatus } };
                }
                return w;
            }));
            // Reload stats to reflect new placement numbers
            const statsRes = await api.get('/agency/dashboard');
            setStats(statsRes.data);
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    };

    // Filters
    const filteredWorkers = workers.filter(w => {
        const matchesQuery = !searchQuery ||
            w.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            w.phone?.includes(searchQuery) ||
            w.preferredLocation?.toLowerCase().includes(searchQuery.toLowerCase());

        const wStatus = w.availability && typeof w.availability === 'object' ? w.availability.status : 'AVAILABLE';
        const matchesStatus = statusFilter === 'ALL' || wStatus === statusFilter;

        const matchesSkill = skillFilter === 'ALL' ||
            (w.skills || []).some(s => s.toLowerCase().includes(skillFilter.toLowerCase()));

        return matchesQuery && matchesStatus && matchesSkill;
    });

    const user = authService.getCurrentUser();

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px 80px', fontFamily: "'Inter', sans-serif" }}>
            {/* Header & Agency Identity Banner */}
            <div style={{
                background: 'linear-gradient(135deg, #0f766e 0%, #134e4a 100%)',
                color: 'white',
                padding: '30px',
                borderRadius: '20px',
                boxShadow: '0 10px 25px rgba(15, 118, 110, 0.15)',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '20px',
                marginBottom: '30px'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            color: '#e6fffa',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <Shield size={12} /> LICENSED PLACEMENT AGENCY (ደላላ / ኤጀንሲ)
                        </span>
                        {stats?.agency?.isVerified && (
                            <span style={{
                                background: '#10b981',
                                color: 'white',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                padding: '4px 10px',
                                borderRadius: '12px'
                            }}>
                                ✓ VERIFIED LICENSE
                            </span>
                        )}
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>
                        {stats?.agency?.name || user?.name || 'Agency Portal'}
                    </h1>
                    <p style={{ margin: '6px 0 0 0', opacity: 0.9, fontSize: '0.95rem' }}>
                        Manage domestic worker pools, bulk-onboard helpers, and track placements across Addis Ababa.
                    </p>
                </div>

                {/* Referral / Agency Code Box */}
                {stats?.agency?.referralCode && (
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.12)',
                        backdropFilter: 'blur(10px)',
                        padding: '12px 20px',
                        borderRadius: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        textAlign: 'right'
                    }}>
                        <div style={{ fontSize: '0.75rem', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Your Agency Code
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '1px' }}>
                                {stats.agency.referralCode}
                            </span>
                            <button
                                onClick={handleCopyReferralCode}
                                title="Copy Agency Code"
                                style={{
                                    background: 'white',
                                    color: '#0f766e',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                {copiedCode ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Metric Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
            }}>
                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Managed Pool</span>
                        <Users size={20} color="#0f766e" />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', marginTop: '10px' }}>
                        {stats?.metrics?.totalManagedWorkers || 0}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                        {stats?.metrics?.verifiedWorkers || 0} ID verified
                    </div>
                </div>

                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Available for Hire</span>
                        <CheckCircle size={20} color="#10b981" />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#10b981', marginTop: '10px' }}>
                        {stats?.metrics?.availableWorkers || 0}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                        Ready for instant deployment
                    </div>
                </div>

                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Currently Placed</span>
                        <Briefcase size={20} color="#3b82f6" />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#3b82f6', marginTop: '10px' }}>
                        {stats?.metrics?.placedWorkers || 0}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                        Active household contracts
                    </div>
                </div>

                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Placement Rate</span>
                        <Award size={20} color="#eab308" />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', marginTop: '10px' }}>
                        {stats?.metrics?.placementRate || 0}%
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                        Avg rating: ★ {stats?.metrics?.averageRating || '5.0'}
                    </div>
                </div>
            </div>

            {/* Action Bar (Search, Filters, Add & Bulk Import Buttons) */}
            <div style={{
                background: 'white',
                padding: '16px 20px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '20px'
            }}>
                {/* Search */}
                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: '10px', padding: '8px 12px', border: '1px solid #e2e8f0', minWidth: '240px' }}>
                    <Search size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
                    <input
                        type="text"
                        placeholder="Search worker by name, phone, area..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', width: '100%' }}
                    />
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: 'white' }}
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="AVAILABLE">Available</option>
                        <option value="PLACED">Placed</option>
                    </select>

                    <select
                        value={skillFilter}
                        onChange={(e) => setSkillFilter(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: 'white' }}
                    >
                        <option value="ALL">All Skills</option>
                        <option value="Nanny">Nanny</option>
                        <option value="Cook">Cook</option>
                        <option value="Housekeeper">Housekeeper</option>
                        <option value="Elderly Care">Elder Care</option>
                    </select>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => setIsBulkOpen(true)}
                        style={{
                            background: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        <UploadCloud size={16} /> Bulk Import
                    </button>

                    <button
                        onClick={() => setIsAddWorkerOpen(true)}
                        style={{
                            background: '#0f766e',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        <UserPlus size={16} /> Add Worker
                    </button>
                </div>
            </div>

            {/* Workers Table */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px 0', color: '#64748b' }}>
                        <RefreshCw size={28} style={{ animation: 'spin 1s infinite linear', marginBottom: '8px' }} />
                        <p>Loading agency worker roster...</p>
                    </div>
                ) : filteredWorkers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                        <Users size={40} color="#cbd5e1" style={{ marginBottom: '10px' }} />
                        <h3 style={{ margin: 0, color: '#334155' }}>No workers found</h3>
                        <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                            {workers.length === 0
                                ? 'Your agency has not onboarded any workers yet. Use "+ Add Worker" or "Bulk Import" to start.'
                                : 'Try clearing your search or status filters.'}
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th style={{ padding: '14px 20px' }}>Worker</th>
                                    <th style={{ padding: '14px 20px' }}>Phone</th>
                                    <th style={{ padding: '14px 20px' }}>Skills</th>
                                    <th style={{ padding: '14px 20px' }}>Expected Salary</th>
                                    <th style={{ padding: '14px 20px' }}>Status</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredWorkers.map(w => {
                                    const currentStatus = w.availability && typeof w.availability === 'object' ? w.availability.status : 'AVAILABLE';
                                    const isAvailable = currentStatus === 'AVAILABLE';

                                    return (
                                        <tr key={w.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <img
                                                        src={w.profilePhoto || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&q=80'}
                                                        alt={w.fullName}
                                                        style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }}
                                                    />
                                                    <div>
                                                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{w.fullName}</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <MapPin size={12} /> {w.preferredLocation || 'Addis Ababa'} • {w.experienceYears || 1}y exp
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 20px', color: '#334155' }}>
                                                {w.phone || 'N/A'}
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    {(w.skills || []).slice(0, 2).map((s, idx) => (
                                                        <span key={idx} style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px' }}>
                                                            {s}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 20px', fontWeight: '600', color: '#0f766e' }}>
                                                {w.expectedSalary ? `${w.expectedSalary.toLocaleString()} ETB` : 'Negotiable'}
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <span style={{
                                                    background: isAvailable ? '#ecfdf5' : '#eff6ff',
                                                    color: isAvailable ? '#059669' : '#2563eb',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '700',
                                                    padding: '4px 10px',
                                                    borderRadius: '12px'
                                                }}>
                                                    {isAvailable ? 'AVAILABLE' : 'PLACED'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => handleToggleStatus(w.id, currentStatus)}
                                                    style={{
                                                        background: isAvailable ? '#3b82f6' : '#10b981',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '6px 12px',
                                                        borderRadius: '8px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {isAvailable ? 'Mark Placed' : 'Mark Available'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL: Add Single Worker */}
            {isAddWorkerOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '30px',
                        width: '100%',
                        maxWidth: '520px',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Onboard Worker to Agency</h2>
                            <button onClick={() => setIsAddWorkerOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {singleSuccess && (
                            <div style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '10px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px' }}>
                                {singleSuccess}
                            </div>
                        )}

                        {singleError && (
                            <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '10px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px' }}>
                                {singleError}
                            </div>
                        )}

                        <form onSubmit={handleAddWorker} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Worker Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Tigist Alemu"
                                    value={workerForm.fullName}
                                    onChange={(e) => setWorkerForm({ ...workerForm, fullName: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Phone Number</label>
                                    <input
                                        type="text"
                                        placeholder="0911..."
                                        value={workerForm.phone}
                                        onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Expected Salary (ETB)</label>
                                    <input
                                        type="number"
                                        value={workerForm.expectedSalary}
                                        onChange={(e) => setWorkerForm({ ...workerForm, expectedSalary: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Skills (comma separated)</label>
                                <input
                                    type="text"
                                    placeholder="Nanny, Cook, Housekeeper"
                                    value={workerForm.skills}
                                    onChange={(e) => setWorkerForm({ ...workerForm, skills: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Preferred Area</label>
                                    <input
                                        type="text"
                                        value={workerForm.preferredLocation}
                                        onChange={(e) => setWorkerForm({ ...workerForm, preferredLocation: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>Arrangement</label>
                                    <select
                                        value={workerForm.preferredArrangement}
                                        onChange={(e) => setWorkerForm({ ...workerForm, preferredArrangement: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', background: 'white' }}
                                    >
                                        <option value="LIVE_IN">Live-In</option>
                                        <option value="LIVE_OUT">Live-Out</option>
                                        <option value="PART_TIME">Part-Time</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={savingWorker}
                                style={{
                                    background: '#0f766e',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    fontWeight: '700',
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    marginTop: '8px'
                                }}
                            >
                                {savingWorker ? 'Saving...' : 'Confirm & Add Worker'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Bulk Import */}
            {isBulkOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '30px',
                        width: '100%',
                        maxWidth: '580px',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileSpreadsheet size={22} color="#0f766e" /> Bulk Import Workers
                            </h2>
                            <button onClick={() => setIsBulkOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
                            Paste multiple workers directly below. Accepts either <b>CSV lines</b> (one worker per line) or a <b>JSON array</b>. Up to 50 workers per batch.
                        </p>

                        <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', fontSize: '0.75rem', fontFamily: 'monospace', marginBottom: '16px', color: '#475569', border: '1px solid #e2e8f0' }}>
                            Format: FullName, Phone, Skills, ExpYears, Salary, Location<br />
                            Example:<br />
                            Selamawit Bekele, 0911223344, Nanny;Cook, 3, 6500, Bole<br />
                            Almaz Tesfaye, 0922334455, Housekeeper, 2, 5000, CMC
                        </div>

                        {bulkResult && (
                            <div style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px' }}>
                                ✓ Successfully imported <b>{bulkResult.importedCount}</b> workers! ({bulkResult.skippedCount} skipped / duplicates)
                            </div>
                        )}

                        {bulkError && (
                            <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px' }}>
                                {bulkError}
                            </div>
                        )}

                        <form onSubmit={handleBulkUpload} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <textarea
                                rows={8}
                                placeholder="Paste your CSV or JSON data here..."
                                value={bulkData}
                                onChange={(e) => setBulkData(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.85rem', boxSizing: 'border-box' }}
                            />

                            <button
                                type="submit"
                                disabled={uploadingBulk || !bulkData.trim()}
                                style={{
                                    background: '#0f766e',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    fontWeight: '700',
                                    fontSize: '0.95rem',
                                    cursor: 'pointer'
                                }}
                            >
                                {uploadingBulk ? 'Importing Workers...' : 'Start Bulk Import'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

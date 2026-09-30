import React, { useState, useEffect } from 'react';
import { 
    Search, 
    ShieldCheck, 
    Star, 
    Briefcase, 
    Users, 
    MapPin, 
    Phone, 
    Sparkles, 
    CheckCircle2, 
    ExternalLink, 
    LogIn, 
    ArrowRight,
    RefreshCw
} from 'lucide-react';
import useTelegram from '../hooks/useTelegram';
import api from '../services/api';

export default function TelegramMiniApp() {
    const { 
        tg, 
        isTMA, 
        user: tgUser, 
        initData, 
        triggerHaptic, 
        openLink 
    } = useTelegram();

    const [activeTab, setActiveTab] = useState('workers'); // 'workers' | 'jobs' | 'account'
    const [feedData, setFeedData] = useState({ stats: {}, recentJobs: [], featuredWorkers: [] });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [currentUser, setCurrentUser] = useState(null);
    const [linkForm, setLinkForm] = useState({ identifier: '', password: '' });
    const [linking, setLinking] = useState(false);
    const [linkSuccess, setLinkSuccess] = useState('');
    const [linkError, setLinkError] = useState('');

    // Categories tailored to Ethiopian Domestic Help
    const categories = [
        { id: 'ALL', label: 'All Helpers', am: 'ሁሉም' },
        { id: 'Nanny', label: 'Nanny / Childcare', am: 'ሞግዚት' },
        { id: 'Housekeeper', label: 'Housekeeper / Cleaning', am: 'ጽዳት' },
        { id: 'Cook', label: 'Cook / Chef', am: 'ምግብ አብሳይ' },
        { id: 'Elderly Care', label: 'Elderly Care', am: 'አረጋውያን' }
    ];

    // Fetch initial feed & check Telegram authentication
    useEffect(() => {
        loadFeed();
        attemptTelegramAuth();
    }, []);

    const loadFeed = async () => {
        try {
            setLoading(true);
            const res = await api.get('/telegram/feed');
            setFeedData(res.data);
        } catch (err) {
            console.error('Failed to load feed:', err);
        } finally {
            setLoading(false);
        }
    };

    const attemptTelegramAuth = async () => {
        // If initData is present, attempt background login
        if (initData) {
            try {
                const res = await api.post('/telegram/auth', { initData });
                if (res.data?.isLinked && res.data?.token) {
                    localStorage.setItem('token', res.data.token);
                    localStorage.setItem('user', JSON.stringify(res.data.user));
                    setCurrentUser(res.data.user);
                }
            } catch (err) {
                console.debug('[TMA Auth Background]', err.message);
            }
        } else {
            // Check localStorage
            const saved = localStorage.getItem('user');
            if (saved) {
                try {
                    setCurrentUser(JSON.parse(saved));
                } catch (e) {
                    // ignore
                }
            }
        }
    };

    const handleLinkAccount = async (e) => {
        e.preventDefault();
        setLinkError('');
        setLinkSuccess('');
        setLinking(true);
        triggerHaptic('medium');

        try {
            const res = await api.post('/telegram/link-account', {
                identifier: linkForm.identifier,
                password: linkForm.password,
                telegramChatId: tgUser?.id?.toString() || 'unknown',
                telegramUsername: tgUser?.username || ''
            });

            if (res.data?.success) {
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                setCurrentUser(res.data.user);
                setLinkSuccess(res.data.message || 'Account successfully linked!');
                triggerHaptic('success');
            }
        } catch (err) {
            setLinkError(err.response?.data?.error || 'Failed to link account. Please verify credentials.');
            triggerHaptic('error');
        } finally {
            setLinking(false);
        }
    };

    // Filter workers based on query & category
    const filteredWorkers = (feedData.featuredWorkers || []).filter(worker => {
        const matchesQuery = !searchQuery || 
            worker.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            worker.preferredLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (worker.skills || []).some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCat = selectedCategory === 'ALL' || 
            (worker.skills || []).some(s => s.toLowerCase().includes(selectedCategory.toLowerCase()));

        return matchesQuery && matchesCat;
    });

    // Filter jobs based on query
    const filteredJobs = (feedData.recentJobs || []).filter(job => {
        return !searchQuery || 
            job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.locationRegion?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--tg-theme-bg-color, #f8fafc)',
            color: 'var(--tg-theme-text-color, #1e293b)',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            paddingBottom: '80px',
            maxWidth: '600px',
            margin: '0 auto'
        }}>
            {/* Top Bar / Header */}
            <div style={{
                background: 'linear-gradient(135deg, #008080 0%, #005A5B 100%)',
                color: 'white',
                padding: '20px 16px 16px 16px',
                borderBottomLeftRadius: '24px',
                borderBottomRightRadius: '24px',
                boxShadow: '0 8px 24px rgba(0, 128, 128, 0.15)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                            fontWeight: '800'
                        }}>
                            ✨
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Trustworthy Domestic Workers
                            </div>
                            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>
                                TDW Ethiopia
                            </h1>
                        </div>
                    </div>

                    {currentUser ? (
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <CheckCircle2 size={14} color="#86efac" />
                            <span>{currentUser.fullName || currentUser.contactName || 'Linked'}</span>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                setActiveTab('account');
                                triggerHaptic('light');
                            }}
                            style={{
                                background: '#f59e0b',
                                color: '#1e293b',
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <LogIn size={14} /> Link Account
                        </button>
                    )}
                </div>

                {/* Welcome message with Telegram User */}
                <div style={{ fontSize: '0.9rem', opacity: 0.95, marginTop: '8px' }}>
                    {tgUser ? `ሰላም, ${tgUser.first_name}! Find trusted help in Ethiopia.` : 'Welcome! Connect with verified domestic help in Addis Ababa.'}
                </div>

                {/* Quick stats pills */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <div style={{
                        flex: 1,
                        background: 'rgba(255, 255, 255, 0.12)',
                        backdropFilter: 'blur(8px)',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Users size={18} />
                        <div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Workers</div>
                            <div style={{ fontSize: '1rem', fontWeight: '700' }}>{feedData.stats?.totalWorkers || '120+'}</div>
                        </div>
                    </div>

                    <div style={{
                        flex: 1,
                        background: 'rgba(255, 255, 255, 0.12)',
                        backdropFilter: 'blur(8px)',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Briefcase size={18} />
                        <div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Active Jobs</div>
                            <div style={{ fontSize: '1rem', fontWeight: '700' }}>{feedData.stats?.totalJobs || '45+'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Input */}
            <div style={{ padding: '16px 16px 8px 16px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--tg-theme-secondary-bg-color, white)',
                    borderRadius: '14px',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                    <Search size={18} color="#94a3b8" style={{ marginRight: '10px' }} />
                    <input
                        type="text"
                        placeholder="Search by skill, name, or area (e.g. Bole)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            border: 'none',
                            outline: 'none',
                            width: '100%',
                            fontSize: '0.95rem',
                            background: 'transparent',
                            color: 'inherit'
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Segmented Control Tabs */}
            <div style={{ padding: '0 16px 12px 16px' }}>
                <div style={{
                    display: 'flex',
                    background: '#e2e8f0',
                    borderRadius: '12px',
                    padding: '4px'
                }}>
                    <button
                        onClick={() => {
                            setActiveTab('workers');
                            triggerHaptic('selection');
                        }}
                        style={{
                            flex: 1,
                            padding: '8px 0',
                            border: 'none',
                            borderRadius: '10px',
                            background: activeTab === 'workers' ? 'white' : 'transparent',
                            color: activeTab === 'workers' ? '#008080' : '#64748b',
                            fontWeight: activeTab === 'workers' ? '700' : '500',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: activeTab === 'workers' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                        }}
                    >
                        👷 Workers (ሠራተኞች)
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('jobs');
                            triggerHaptic('selection');
                        }}
                        style={{
                            flex: 1,
                            padding: '8px 0',
                            border: 'none',
                            borderRadius: '10px',
                            background: activeTab === 'jobs' ? 'white' : 'transparent',
                            color: activeTab === 'jobs' ? '#008080' : '#64748b',
                            fontWeight: activeTab === 'jobs' ? '700' : '500',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: activeTab === 'jobs' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                        }}
                    >
                        💼 Jobs (ክፍት ቦታዎች)
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('account');
                            triggerHaptic('selection');
                        }}
                        style={{
                            flex: 1,
                            padding: '8px 0',
                            border: 'none',
                            borderRadius: '10px',
                            background: activeTab === 'account' ? 'white' : 'transparent',
                            color: activeTab === 'account' ? '#008080' : '#64748b',
                            fontWeight: activeTab === 'account' ? '700' : '500',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: activeTab === 'account' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                        }}
                    >
                        ⚙️ Account
                    </button>
                </div>
            </div>

            {/* TAB 1: WORKERS */}
            {activeTab === 'workers' && (
                <div style={{ padding: '0 16px' }}>
                    {/* Category Filter Chips */}
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto',
                        paddingBottom: '12px',
                        scrollbarWidth: 'none'
                    }}>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    setSelectedCategory(cat.id);
                                    triggerHaptic('light');
                                }}
                                style={{
                                    whiteSpace: 'nowrap',
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    border: selectedCategory === cat.id ? '1px solid #008080' : '1px solid #cbd5e1',
                                    background: selectedCategory === cat.id ? '#008080' : 'white',
                                    color: selectedCategory === cat.id ? 'white' : '#475569',
                                    fontSize: '0.8rem',
                                    fontWeight: selectedCategory === cat.id ? '700' : '500',
                                    cursor: 'pointer'
                                }}
                            >
                                {cat.label} ({cat.am})
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                            <RefreshCw size={24} style={{ animation: 'spin 1s infinite linear' }} />
                            <p style={{ marginTop: '8px' }}>Loading verified Ethiopian helpers...</p>
                        </div>
                    ) : filteredWorkers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b', background: 'white', borderRadius: '16px' }}>
                            <Users size={36} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                            <p style={{ margin: 0, fontWeight: '600' }}>No helpers found matching your filter.</p>
                            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Try clearing the search or category.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredWorkers.map(worker => (
                                <div
                                    key={worker.id}
                                    style={{
                                        background: 'var(--tg-theme-secondary-bg-color, white)',
                                        borderRadius: '16px',
                                        padding: '16px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div style={{ position: 'relative' }}>
                                            <img
                                                src={worker.profilePhoto || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80'}
                                                alt={worker.fullName}
                                                style={{
                                                    width: '56px',
                                                    height: '56px',
                                                    borderRadius: '16px',
                                                    objectFit: 'cover',
                                                    border: '2px solid #008080'
                                                }}
                                            />
                                            {worker.isVerified && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: -4,
                                                    right: -4,
                                                    background: '#008080',
                                                    color: 'white',
                                                    borderRadius: '50%',
                                                    width: '20px',
                                                    height: '20px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '10px'
                                                }}>
                                                    ✓
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>
                                                    {worker.fullName}
                                                </h3>
                                                <span style={{
                                                    background: worker.tier === 'PLATINUM' ? '#ede9fe' : '#f0fdf4',
                                                    color: worker.tier === 'PLATINUM' ? '#6b21a8' : '#166534',
                                                    fontSize: '0.7rem',
                                                    fontWeight: '700',
                                                    padding: '2px 8px',
                                                    borderRadius: '10px'
                                                }}>
                                                    {worker.tier || 'VERIFIED'}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.8rem', color: '#64748b' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                    <MapPin size={12} /> {worker.preferredLocation || 'Addis Ababa'}
                                                </span>
                                                •
                                                <span>{worker.experienceYears || 1}+ yrs exp</span>
                                                {worker.rating > 0 && (
                                                    <>
                                                        •
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#eab308' }}>
                                                            <Star size={12} fill="#eab308" /> {worker.rating.toFixed(1)}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Skills tag */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {(worker.skills || ['Housekeeper']).slice(0, 3).map((skill, sIdx) => (
                                            <span
                                                key={sIdx}
                                                style={{
                                                    background: '#f1f5f9',
                                                    color: '#334155',
                                                    fontSize: '0.75rem',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px'
                                                }}
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Salary and Action Button */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Expected Salary</div>
                                            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#008080' }}>
                                                {worker.expectedSalary ? `${worker.expectedSalary.toLocaleString()} ETB/mo` : 'Negotiable'}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                triggerHaptic('medium');
                                                openLink(`https://trustworthydomesticworkers.web.app/`);
                                            }}
                                            style={{
                                                background: '#008080',
                                                color: 'white',
                                                border: 'none',
                                                padding: '8px 16px',
                                                borderRadius: '12px',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            View & Contact <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: JOBS */}
            {activeTab === 'jobs' && (
                <div style={{ padding: '0 16px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                            <RefreshCw size={24} style={{ animation: 'spin 1s infinite linear' }} />
                            <p style={{ marginTop: '8px' }}>Loading Ethiopian job postings...</p>
                        </div>
                    ) : filteredJobs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b', background: 'white', borderRadius: '16px' }}>
                            <Briefcase size={36} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                            <p style={{ margin: 0, fontWeight: '600' }}>No job listings currently match.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredJobs.map(job => (
                                <div
                                    key={job.id}
                                    style={{
                                        background: 'var(--tg-theme-secondary-bg-color, white)',
                                        borderRadius: '16px',
                                        padding: '16px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>{job.title}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                                <MapPin size={12} />
                                                <span>{job.address || job.locationRegion || 'Addis Ababa'}</span>
                                            </div>
                                        </div>
                                        <span style={{
                                            background: '#e0f2fe',
                                            color: '#0369a1',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            padding: '4px 8px',
                                            borderRadius: '8px'
                                        }}>
                                            {job.arrangement || 'Full-Time'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Offered Salary</div>
                                            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#15803d' }}>
                                                {job.salaryOffered ? `${job.salaryOffered.toLocaleString()} ETB` : 'Competitive'}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                triggerHaptic('medium');
                                                openLink('https://trustworthydomesticworkers.web.app/');
                                            }}
                                            style={{
                                                background: '#0f766e',
                                                color: 'white',
                                                border: 'none',
                                                padding: '8px 16px',
                                                borderRadius: '12px',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            Apply Now <ExternalLink size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: ACCOUNT / LINKING */}
            {activeTab === 'account' && (
                <div style={{ padding: '0 16px' }}>
                    <div style={{
                        background: 'var(--tg-theme-secondary-bg-color, white)',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                    }}>
                        {currentUser ? (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    background: '#008080',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 12px auto',
                                    fontSize: '1.5rem',
                                    fontWeight: '800'
                                }}>
                                    {(currentUser.fullName || currentUser.contactName || 'U')[0]}
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                                    {currentUser.fullName || currentUser.contactName}
                                </h3>
                                <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>
                                    Role: <b>{currentUser.role}</b> • Tier: <b>{currentUser.tier || 'STANDARD'}</b>
                                </p>

                                <div style={{
                                    marginTop: '16px',
                                    padding: '12px',
                                    background: '#f0fdf4',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: '12px',
                                    color: '#166534',
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    justifyContent: 'center'
                                }}>
                                    <CheckCircle2 size={16} />
                                    <span>Your Telegram is linked to your TDW account!</span>
                                </div>

                                <button
                                    onClick={() => {
                                        localStorage.removeItem('token');
                                        localStorage.removeItem('user');
                                        setCurrentUser(null);
                                        triggerHaptic('medium');
                                    }}
                                    style={{
                                        marginTop: '20px',
                                        background: 'transparent',
                                        color: '#ef4444',
                                        border: '1px solid #fecaca',
                                        padding: '8px 16px',
                                        borderRadius: '12px',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Unlink / Sign Out on this device
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                    <ShieldCheck size={28} color="#008080" />
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Link TDW Account</h3>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            Connect your account to receive live alerts and job updates
                                        </div>
                                    </div>
                                </div>

                                {linkSuccess && (
                                    <div style={{
                                        background: '#f0fdf4',
                                        color: '#166534',
                                        border: '1px solid #bbf7d0',
                                        padding: '10px',
                                        borderRadius: '10px',
                                        fontSize: '0.85rem',
                                        marginBottom: '12px'
                                    }}>
                                        {linkSuccess}
                                    </div>
                                )}

                                {linkError && (
                                    <div style={{
                                        background: '#fef2f2',
                                        color: '#b91c1c',
                                        border: '1px solid #fecaca',
                                        padding: '10px',
                                        borderRadius: '10px',
                                        fontSize: '0.85rem',
                                        marginBottom: '12px'
                                    }}>
                                        {linkError}
                                    </div>
                                )}

                                <form onSubmit={handleLinkAccount} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px' }}>
                                            Phone Number or Email
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="09... or email@domain.com"
                                            value={linkForm.identifier}
                                            onChange={(e) => setLinkForm({ ...linkForm, identifier: e.target.value })}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                borderRadius: '10px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '0.9rem',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px' }}>
                                            TDW Password
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="Enter your password"
                                            value={linkForm.password}
                                            onChange={(e) => setLinkForm({ ...linkForm, password: e.target.value })}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                borderRadius: '10px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '0.9rem',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={linking}
                                        style={{
                                            background: '#008080',
                                            color: 'white',
                                            border: 'none',
                                            padding: '12px',
                                            borderRadius: '12px',
                                            fontSize: '0.95rem',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            marginTop: '6px'
                                        }}
                                    >
                                        {linking ? 'Linking Account...' : 'Link Telegram & Sign In'}
                                    </button>
                                </form>

                                <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.85rem', color: '#64748b' }}>
                                    Don't have an account yet?{' '}
                                    <a
                                        href="https://trustworthydomesticworkers.web.app/register"
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ color: '#008080', fontWeight: '600' }}
                                    >
                                        Register on Web
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

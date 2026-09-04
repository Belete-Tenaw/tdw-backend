import React, { useState, useEffect } from 'react';
import { Gift, Users, Trophy, ChevronRight, Star, Zap, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import authService from '../services/authService';
import { useTranslation } from 'react-i18next';
import '../index.css';

const RewardsDashboard = () => {
    const { t } = useTranslation();
    const [user, setUser] = useState(authService.getCurrentUser());
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const endpoint = user.role === 'JOB_SEEKER' ? `/seekers/${user.id}` : `/employers/${user.id}`;
            const res = await api.get(endpoint);
            setProfile(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch rewards data", error);
            setLoading(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <div className="spinner"></div>
        </div>
    );

    const points = profile?.rewardPoints || 0;
    const referrals = profile?.referralCount || 0;

    const rewardItems = [
        { id: 1, title: 'Profile Boost', cost: 100, icon: <Zap size={24} />, desc: 'Appear at the top of search results for 7 days.' },
        { id: 2, title: 'Trust Badge', cost: 250, icon: <ShieldCheck size={24} />, desc: 'Get a "Community Trusted" badge on your profile.' },
        { id: 3, title: 'Premium Discount', cost: 500, icon: <Star size={24} />, desc: '50% discount on your next subscription upgrade.' },
    ];

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
            {/* Header / Points Summary */}
            <div style={{ 
                background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)', 
                borderRadius: '32px', 
                padding: '40px', 
                color: 'white', 
                marginBottom: '40px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 20px 40px rgba(0, 128, 128, 0.2)'
            }}>
                <div>
                    <h1 style={{ margin: '0 0 10px', fontSize: '2.5rem', fontWeight: '900' }}>{t('rewards_title') || 'Your Rewards'}</h1>
                    <p style={{ opacity: 0.9, fontSize: '1.1rem' }}>{t('rewards_subtitle') || 'Refer friends and complete tasks to earn points.'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', opacity: 0.8, marginBottom: '5px', textTransform: 'uppercase' }}>{t('current_balance')}</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: '900', lineHeight: 1 }}>{points}</div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', opacity: 0.9 }}>{t('points_label')}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                {/* Referral Card */}
                <div className="card" style={{ padding: '30px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '48px', height: '48px', background: '#eef2ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                            <Users size={24} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontWeight: '800' }}>{t('referrals') || 'Referrals'}</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{referrals} successful invites</p>
                        </div>
                    </div>
                    
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>{t('referral_code_label')}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)', letterSpacing: '2px' }}>{profile?.referralCode || 'N/A'}</span>
                            <button 
                                onClick={() => navigator.clipboard.writeText(profile?.referralCode)}
                                style={{ background: 'white', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                            >
                                {t('copy') || 'Copy'}
                            </button>
                        </div>
                    </div>
                    
                    <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>
                        {t('earn_label') || 'Earn'} <strong>50 {t('points_label')}</strong> {t('earned_referral_points')}
                    </p>
                </div>

                {/* Redeem Center */}
                <div style={{ gridColumn: 'span 1' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Gift size={24} color="var(--primary)" /> {t('redeem_points') || 'Redeem Points'}
                    </h2>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {rewardItems.map(item => (
                            <div key={item.id} className="card" style={{ 
                                padding: '20px', 
                                borderRadius: '20px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '15px',
                                opacity: points >= item.cost ? 1 : 0.6,
                                cursor: points >= item.cost ? 'pointer' : 'default'
                            }}>
                                <div style={{ 
                                    width: '50px', height: '50px', borderRadius: '14px', 
                                    background: 'rgba(0, 128, 128, 0.05)', color: 'var(--primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {item.icon}
                                </div>
                                <div style={{ flexGrow: 1 }}>
                                    <h4 style={{ margin: '0 0 4px', fontWeight: '800' }}>{item.title}</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{item.desc}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: points >= item.cost ? 'var(--primary)' : '#94a3b8' }}>{item.cost}</div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Points</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Achievements Section */}
            <div style={{ marginTop: '50px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Trophy size={24} color="#f59e0b" /> {t('achievements') || 'Achievements'}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                    {[
                        { title: 'Early Bird', earned: true, desc: 'Joined during launch' },
                        { title: 'Fast Responder', earned: referrals > 0, desc: 'Invited first friend' },
                        { title: 'Top Rated', earned: profile?.rating >= 4.5, desc: 'Maintained high rating' },
                        { title: 'Video Pro', earned: !!profile?.videoBio, desc: 'Uploaded a video bio' },
                    ].map(ach => (
                        <div key={ach.title} style={{ 
                            background: ach.earned ? 'white' : '#f8fafc', 
                            border: ach.earned ? '1px solid #f1f5f9' : '1px dashed #e2e8f0',
                            padding: '25px', 
                            borderRadius: '24px', 
                            textAlign: 'center',
                            opacity: ach.earned ? 1 : 0.5
                        }}>
                            <div style={{ 
                                width: '60px', height: '60px', margin: '0 auto 15px', 
                                background: ach.earned ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' : '#e2e8f0',
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', boxShadow: ach.earned ? '0 10px 20px rgba(245, 158, 11, 0.2)' : 'none'
                            }}>
                                <Star size={28} fill={ach.earned ? "white" : "none"} />
                            </div>
                            <h4 style={{ margin: '0 0 5px', fontWeight: '800' }}>{ach.title}</h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{ach.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RewardsDashboard;

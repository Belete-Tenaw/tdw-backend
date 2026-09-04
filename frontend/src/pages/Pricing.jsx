import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Shield, Star, Crown, MessageSquare, Smartphone, Camera, CheckCircle, CreditCard, ExternalLink, Loader, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Pricing = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [refId, setRefId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('AUTOMATED'); // AUTOMATED or MANUAL
    const [initiating, setInitiating] = useState(false);

    useEffect(() => {
        const fetchTiers = async () => {
            try {
                const response = await api.get('/payments/tiers');
                const data = response.data;
                
                // Map backend tiers to frontend UI requirements
                const mappedPlans = data.map(tier => ({
                    id: tier.id,
                    dbTier: tier.tier, // Store actual DB tier enum
                    name: tier.name, // Use provided name from DB
                    icon: getIconForTier(tier.tier, tier.period),
                    price: tier.priceETB.toString(),
                    duration: getDurationLabel(tier.durationDays, tier.period),
                    features: tier.features,
                    color: getColorForTier(tier.tier),
                    popular: tier.tier === 'GOLD' && tier.period === 'QUARTERLY'
                }));
                
                setPlans(mappedPlans);
            } catch (err) {
                console.error('Error fetching tiers:', err);
                setError(err.message);
                // Fallback to static plans if API fails during transition
                setPlans(staticFallbackPlans);
            } finally {
                setLoading(false);
            }
        };

        fetchTiers();
        setSelectedPlan(null);
    }, []);

    const getIconForTier = (tier, period) => {
        if (tier === 'PLATINUM') return <Shield size={32} color="var(--primary)" />;
        if (tier === 'GOLD') return <Crown size={32} color="#FBBF24" />;
        return <Star size={32} color="#9CA3AF" />;
    };

    const getColorForTier = (tier) => {
        if (tier === 'PLATINUM') return 'var(--primary)';
        if (tier === 'GOLD') return '#FBBF24';
        return '#9CA3AF';
    };

    const getDurationLabel = (days, period) => {
        if (period === 'MONTHLY') return t('days_30');
        if (period === 'QUARTERLY') return t('days_90');
        if (period === 'SEMI_ANNUAL') return t('months_6');
        if (period === 'ANNUAL') return t('year_1');
        return `${days} ${t('days')}`;
    };

    const staticFallbackPlans = [
        { id: 'SILVER', name: t('silver'), icon: <Star size={32} color="#9CA3AF" />, price: '500', duration: t('days_30'), features: [t('pricing_features.basic_visibility')], color: '#9CA3AF' }
    ];

    const handleSelect = async (plan, provider = 'CHAPA') => {
        setSelectedPlan(plan);
        const newRef = `EDWL-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        setRefId(newRef);

        if (paymentMethod === 'AUTOMATED') {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login?redirect=pricing');
                return;
            }

            setInitiating(true);
            try {
                const res = await api.post('/payments/initiate', {
                    tierId: plan.id,
                    provider: provider
                });

                if (res.data.paymentUrl) {
                    window.location.href = res.data.paymentUrl;
                } else {
                    alert('Failed to get payment URL. Please try manual payment.');
                    setPaymentMethod('MANUAL');
                }
            } catch (err) {
                console.error('Payment initiation failed:', err);
                alert(err.response?.data?.error || 'Payment initiation failed. Please try manual payment.');
                setPaymentMethod('MANUAL');
            } finally {
                setInitiating(false);
            }
        } else {
            const element = document.getElementById('manual-payment-steps');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    const getTelegramLink = () => {
        if (!selectedPlan) return `https://t.me/+251943194099`;
        const message = encodeURIComponent(`Hello TDW Support,\n\nI want to subscribe to the ${selectedPlan.name} plan (${selectedPlan.price} ETB).\n\nMy Transaction Reference ID: #${refId}\n\n[ሰላም የTDW ድጋፍ ሰጪ ክፍል። በ${selectedPlan.name} ፕላን (${selectedPlan.price} ብር) ለመመዝገብ እፈልጋለሁ። የክፍያ መለያዬ፡ #${refId}]`);
        return `https://t.me/+251943194099?text=${message}`;
    };

    return (
        <div className="container" style={{ padding: '60px 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '15px' }}>{t('choose_plan')}</h1>
                <p style={{ color: '#666', fontSize: '1.2rem' }}>{t('choose_plan_msg')}</p>
                
                <div style={{ display: 'inline-flex', background: '#f0f0f0', padding: '5px', borderRadius: '12px', marginTop: '30px' }}>
                    <button 
                        onClick={() => setPaymentMethod('AUTOMATED')}
                        style={{ 
                            padding: '10px 20px', 
                            borderRadius: '10px', 
                            border: 'none', 
                            background: paymentMethod === 'AUTOMATED' ? 'white' : 'transparent',
                            color: paymentMethod === 'AUTOMATED' ? 'var(--primary)' : '#666',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <CreditCard size={18} /> {t('automated_payment') || 'Instant Pay (Chapa/Telebirr)'}
                    </button>
                    <button 
                        onClick={() => setPaymentMethod('MANUAL')}
                        style={{ 
                            padding: '10px 20px', 
                            borderRadius: '10px', 
                            border: 'none', 
                            background: paymentMethod === 'MANUAL' ? 'white' : 'transparent',
                            color: paymentMethod === 'MANUAL' ? 'var(--primary)' : '#666',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <MessageSquare size={18} /> {t('manual_payment') || 'Manual Pay (Telegram)'}
                    </button>
                </div>
            </div>

            {/* Returning User Nudge for Pricing */}
            {!localStorage.getItem('token') && (
                <div style={{ 
                    background: '#f8fafc', 
                    padding: '20px 30px', 
                    borderRadius: '16px', 
                    marginBottom: '50px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    border: '1px solid #e2e8f0',
                    maxWidth: '1200px',
                    margin: '0 auto 50px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <LogIn size={24} color="#64748b" />
                        <div>
                            <h4 style={{ margin: 0, fontSize: '1rem', color: '#334155' }}>{t('returning_user') || 'Already have an account?'}</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{t('login_to_subscribe') || 'Log in to apply the subscription to your existing account.'}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate('/login?redirect=pricing')}
                        className="btn-login"
                        style={{ background: '#334155', color: 'white', border: 'none' }}
                    >
                        {t('login')}
                    </button>
                </div>
            )}

            {loading && (
                <div style={{ textAlign: 'center', padding: '100px' }}>
                    <div className="loader" style={{ fontSize: '1.2rem', color: '#666' }}>Loading plans...</div>
                </div>
            )}

            {error && (
                <div style={{ textAlign: 'center', color: '#ef4444', padding: '20px', background: '#fef2f2', borderRadius: '12px', marginBottom: '30px' }}>
                    {error}. Using offline plans.
                </div>
            )}

            {!loading && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '30px',
                    maxWidth: '1200px',
                    margin: '0 auto'
                }}>
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className="card"
                            style={{
                                position: 'relative',
                                border: plan.popular ? `2px solid ${plan.color}` : 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                padding: '30px',
                                transition: 'transform 0.2s',
                                cursor: 'pointer',
                                background: selectedPlan?.id === plan.id ? '#f0f9ff' : 'white'
                            }}
                            onClick={() => handleSelect(plan)}
                        >
                            {plan.popular && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-15px',
                                    right: '20px',
                                    background: plan.color,
                                    color: 'white',
                                    padding: '5px 15px',
                                    borderRadius: '20px',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold'
                                }}>
                                    {t('most_popular')}
                                </div>
                            )}

                            <div>
                                <div style={{ marginBottom: '20px' }}>
                                    {plan.icon}
                                    <h3 style={{ fontSize: '1.5rem', marginTop: '10px' }}>{plan.name}</h3>
                                </div>

                                <div style={{ marginBottom: '30px' }}>
                                    <span style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{plan.price}</span>
                                    <span style={{ color: '#666', marginLeft: '5px' }}>{t('etb_per')} {plan.duration}</span>
                                </div>

                                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '40px' }}>
                                    {plan.features.map((feature, fIndex) => (
                                        <li key={fIndex} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', fontSize: '0.95rem' }}>
                                            <Check size={18} color="#10B981" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {paymentMethod === 'AUTOMATED' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <button
                                        className="btn-primary"
                                        disabled={initiating && selectedPlan?.id === plan.id}
                                        onClick={(e) => { e.stopPropagation(); handleSelect(plan, 'CHAPA'); }}
                                        style={{
                                            width: '100%', padding: '15px', background: plan.popular ? plan.color : '#666',
                                            transform: selectedPlan?.id === plan.id ? 'scale(1.05)' : 'none',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                            border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                                        }}
                                    >
                                        {initiating && selectedPlan?.id === plan.id ? (
                                            <><Loader className="spin" size={20} /> {t('initiating') || 'Initiating...'}</>
                                        ) : (
                                            <><ExternalLink size={18} /> {t('pay_local') || 'Pay Local (Chapa)'}</>
                                        )}
                                    </button>
                                    <button
                                        className="btn-secondary"
                                        disabled={initiating && selectedPlan?.id === plan.id}
                                        onClick={(e) => { e.stopPropagation(); handleSelect(plan, 'STRIPE'); }}
                                        style={{
                                            width: '100%', padding: '15px', background: '#6366f1',
                                            transform: selectedPlan?.id === plan.id ? 'scale(1.05)' : 'none',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                            border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                                        }}
                                    >
                                        {initiating && selectedPlan?.id === plan.id ? (
                                            <><Loader className="spin" size={20} /> {t('initiating') || 'Initiating...'}</>
                                        ) : (
                                            <><CreditCard size={18} /> {t('pay_global') || 'Pay Global (Stripe)'}</>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className="btn-primary"
                                    onClick={(e) => { e.stopPropagation(); handleSelect(plan, 'MANUAL'); }}
                                    style={{
                                        width: '100%', padding: '15px', background: plan.popular ? plan.color : '#666',
                                        transform: selectedPlan?.id === plan.id ? 'scale(1.05)' : 'none',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                        border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                                    }}
                                >
                                    <MessageSquare size={18} /> {t('select_plan_name', { name: plan.name }) || 'Request via Telegram'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {paymentMethod === 'MANUAL' && (
                <div id="manual-payment-steps" style={{
                    marginTop: '60px',
                    padding: '40px',
                    background: '#f8f9fa',
                    borderRadius: '24px',
                    textAlign: 'center',
                    maxWidth: '900px',
                    margin: '60px auto 0',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '10px', color: 'var(--primary)', fontWeight: 'bold' }}>{t('manual_payment_title')}</h2>
                <p style={{ color: '#666', marginBottom: '40px' }}>Quick & Secure Activation via Telegram</p>

                {/* Visual Infographic */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '20px',
                    marginBottom: '50px',
                    position: 'relative'
                }}>
                    {[
                        { icon: <Smartphone size={32} />, label: t('step_pay'), desc: t('infographic_pay_desc'), color: '#3b82f6', step: '1' },
                        { icon: <Camera size={32} />, label: t('step_screenshot'), desc: t('infographic_screenshot_desc'), color: '#f59e0b', step: '2' },
                        { icon: <MessageSquare size={32} />, label: t('step_receive'), desc: t('infographic_receive_desc'), color: '#10b981', step: '3' },
                        { icon: <CheckCircle size={32} />, label: t('step_activate'), desc: t('infographic_activate_desc'), color: 'var(--primary)', step: '4' }
                    ].map((step, idx) => (
                        <div key={idx} style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            gap: '12px',
                            background: 'white',
                            padding: '24px',
                            borderRadius: '20px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                            border: '1px solid #f3f4f6',
                            position: 'relative',
                            transition: 'transform 0.3s'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-10px',
                                right: '-10px',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: step.color,
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '0.85rem'
                            }}>
                                {step.step}
                            </div>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '16px',
                                background: `${step.color}10`,
                                color: step.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {step.icon}
                            </div>
                            <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1f2937' }}>{step.label}</span>
                            <span style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: '1.5' }}>{step.desc}</span>
                        </div>
                    ))}
                </div>

                {selectedPlan && (
                    <div style={{
                        background: '#eff6ff',
                        padding: '40px',
                        borderRadius: '24px',
                        marginBottom: '40px',
                        border: '2px solid #3b82f6',
                        animation: 'fadeIn 0.4s ease-out',
                        boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '15px' }}>
                            <Star size={24} color="#3b82f6" fill="#3b82f6" />
                            <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {t('transaction_id')}
                            </h4>
                        </div>
                        <div style={{
                            background: 'white',
                            display: 'inline-block',
                            padding: '10px 30px',
                            borderRadius: '12px',
                            fontSize: '2.5rem',
                            fontWeight: '900',
                            color: '#1e40af',
                            letterSpacing: '4px',
                            marginBottom: '20px',
                            boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
                            border: '1px solid #dbeafe'
                        }}>
                            #{refId}
                        </div>
                        <p style={{ fontSize: '1.1rem', color: '#3b82f6', fontWeight: '600', maxWidth: '600px', margin: '0 auto 10px' }}>
                            {t('payment_instructions')}
                        </p>
                        <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
                            (Please mention this ID when sending your receipt on Telegram)
                        </p>
                    </div>
                )}

                <div style={{ display: 'grid', gap: '20px', textAlign: 'left', background: 'white', padding: '30px', borderRadius: '20px', border: '1px solid #f3f4f6', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.8rem' }}>1</div>
                        <div>
                            <p style={{ margin: 0, fontWeight: '600' }}>{t('step_1_contact')}</p>
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>Ask for bank details if not already shown.</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.8rem' }}>2</div>
                        <div>
                            <p style={{ margin: 0, fontWeight: '600' }}>{t('step_2_bank')}</p>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                <div style={{ background: '#007bff', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>Telebirr</div>
                                <div style={{ background: '#8b5cf6', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>CBE Birr</div>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.8rem' }}>3</div>
                        <p style={{ margin: 0, fontWeight: '600' }}>{t('step_3_receipt')}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', fontSize: '0.8rem' }}>4</div>
                        <p style={{ margin: 0, fontWeight: '600' }}>{t('step_4_activate')}</p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                    <a
                        href={getTelegramLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            background: '#0088cc',
                            color: 'white',
                            padding: '16px 40px',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            width: '100%',
                            maxWidth: '400px',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0, 136, 204, 0.3)'
                        }}
                    >
                        <MessageSquare size={20} />
                        Contact Admin via Telegram
                    </a>
                    <button
                        className="btn-primary"
                        style={{
                            padding: '12px 30px',
                            background: 'white',
                            color: 'var(--primary)',
                            border: '1px solid var(--primary)',
                            width: '100%',
                            maxWidth: '400px'
                        }}
                        onClick={() => navigate('/activate')}
                    >
                        {t('go_to_activate')}
                    </button>
                    <p style={{ marginTop: '5px', color: '#666', fontSize: '0.9rem' }}>
                        Manual Support: <b>+251 943 194 099</b>
                    </p>
                </div>
            </div>
        )}
    </div>
    );
};

export default Pricing;

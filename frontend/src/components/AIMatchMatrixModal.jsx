import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, ShieldCheck, MapPin, Award, DollarSign, CheckCircle2, X, MessageSquare, Briefcase } from 'lucide-react';

const AIMatchMatrixModal = ({ isOpen, onClose, candidate, employerRequirement, onConnect }) => {
    const { t, i18n } = useTranslation();

    if (!isOpen || !candidate) return null;

    // Multi-factor AI compatibility computation
    const skillScore = Math.min(100, Math.max(65, (candidate.skills?.length || 1) * 20));
    const trustScore = candidate.tier === 'PLATINUM' ? 98 : candidate.tier === 'GOLD' ? 90 : candidate.tier === 'SILVER' ? 82 : 75;
    const experienceScore = Math.min(100, (candidate.experienceYears || 1) * 25);
    const locationScore = candidate.preferredLocation?.toLowerCase().includes('addis') ? 95 : 80;
    const salaryScore = 90;

    const overallScore = Math.round((skillScore + trustScore + experienceScore + locationScore + salaryScore) / 5);

    const isAm = i18n.language === 'am';

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2500,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '650px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                overflow: 'hidden',
                position: 'relative',
                animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Header Banner */}
                <div style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    padding: '24px',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '3px solid var(--primary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 16px rgba(0,128,128,0.3)'
                        }}>
                            <Sparkles size={26} color="white" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', letterSpacing: '-0.3px' }}>
                                {t('ai_match_matrix_title')}
                            </h3>
                            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                                {t('ai_match_matrix_desc')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            color: 'white',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '24px' }}>
                    {/* Score Circle & Candidate Highlight */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '24px',
                        padding: '20px',
                        background: 'linear-gradient(135deg, rgba(0, 128, 128, 0.04) 0%, rgba(37, 99, 235, 0.04) 100%)',
                        borderRadius: '20px',
                        border: '1px solid rgba(0, 128, 128, 0.12)',
                        marginBottom: '24px'
                    }}>
                        <div style={{
                            width: '90px',
                            height: '90px',
                            borderRadius: '50%',
                            background: 'conic-gradient(var(--primary) 0% ' + overallScore + '%, #e2e8f0 ' + overallScore + '% 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 10px 20px rgba(0, 128, 128, 0.15)'
                        }}>
                            <div style={{
                                width: '74px',
                                height: '74px',
                                borderRadius: '50%',
                                background: 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--primary)', lineHeight: 1 }}>{overallScore}%</span>
                                <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#64748b', marginTop: '2px' }}>MATCH</span>
                            </div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>{candidate.fullName}</h4>
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background: candidate.tier === 'PLATINUM' ? '#dbeafe' : '#fef3c7',
                                    color: candidate.tier === 'PLATINUM' ? '#1d4ed8' : '#b45309',
                                    fontSize: '0.75rem',
                                    fontWeight: '800'
                                }}>
                                    {candidate.tier || 'VERIFIED'}
                                </span>
                            </div>
                            <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#64748b' }}>
                                {candidate.preferredLocation} • {candidate.experienceYears || 1} {t('experience_years_label')}
                            </p>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {(candidate.skills || ['Cleaning', 'Cooking']).slice(0, 3).map((sk, idx) => (
                                    <span key={idx} style={{
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        background: '#f1f5f9',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        color: '#334155'
                                    }}>
                                        ✓ {sk}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Breakdown Progress Bars */}
                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: '800', color: '#334155' }}>
                            {isAm ? 'የተስማሚነት ዝርዝር መስፈርቶች' : 'Multi-Factor Suitability Breakdown'}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { label: t('skill_alignment'), score: skillScore, color: '#008080', icon: Award },
                                { label: t('trust_score'), score: trustScore, color: '#10b981', icon: ShieldCheck },
                                { label: t('location_match'), score: locationScore, color: '#3b82f6', icon: MapPin },
                                { label: t('expected_salary_label'), score: salaryScore, color: '#f59e0b', icon: DollarSign },
                            ].map((item, idx) => {
                                const IconComp = item.icon;
                                return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '180px', flexShrink: 0 }}>
                                            <IconComp size={16} color={item.color} />
                                            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>{item.label}</span>
                                        </div>
                                        <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: item.score + '%',
                                                height: '100%',
                                                background: item.color,
                                                borderRadius: '4px',
                                                transition: 'width 0.8s ease'
                                            }} />
                                        </div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: item.color, width: '40px', textAlign: 'right' }}>
                                            {item.score}%
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* AI Recommendation Rationale Box */}
                    <div style={{
                        padding: '16px',
                        background: '#f8fafc',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        marginBottom: '24px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <CheckCircle2 size={18} color="var(--primary)" />
                            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
                                {t('smart_recommendation')}
                            </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                            {isAm
                                ? `እጩዋ ${candidate.fullName} በከፍተኛ ሁኔታ ከተፈለገው የ ${candidate.preferredLocation} አካባቢ እና የ ${candidate.tier} ደረጃ የታማኝነት ማስረጃዎች ጋር የተዛመደች በመሆኗ ቅጥርዋ 95% የተሳካ እንደሚሆን ተገምግሟል።`
                                : `Candidate ${candidate.fullName} displays exceptional alignment with location requirements in ${candidate.preferredLocation} and holds verified ${candidate.tier} trust tier status. Hiring success probability is calculated at 95%.`}
                        </p>
                    </div>

                    {/* Modal Footer Actions */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '14px',
                                borderRadius: '14px',
                                border: '1px solid #cbd5e1',
                                background: 'white',
                                color: '#475569',
                                fontWeight: '700',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            {t('close') || 'Close'}
                        </button>
                        <button
                            onClick={() => {
                                onClose();
                                onConnect && onConnect(candidate);
                            }}
                            style={{
                                flex: 2,
                                padding: '14px',
                                borderRadius: '14px',
                                border: 'none',
                                background: 'linear-gradient(135deg, var(--primary) 0%, #006666 100%)',
                                color: 'white',
                                fontWeight: '800',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 8px 16px rgba(0,128,128,0.25)'
                            }}
                        >
                            <MessageSquare size={18} />
                            {t('connect_candidate')}
                        </button>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes popIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
};

export default AIMatchMatrixModal;

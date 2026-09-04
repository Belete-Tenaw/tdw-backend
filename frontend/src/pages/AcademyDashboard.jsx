import React, { useState, useEffect } from 'react';
import { BookOpen, Award, CheckCircle, Play, ArrowRight, ShieldCheck, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import QuizComponent from '../components/QuizComponent';

const AcademyDashboard = () => {
    const { t } = useTranslation();
    const [modules, setModules] = useState([]);
    const [certifications, setCertifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeQuiz, setActiveQuiz] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [modRes, certRes] = await Promise.all([
                api.get('/api/seeker/training-modules'),
                api.get('/api/seeker/certifications')
            ]);
            setModules(modRes.data);
            setCertifications(certRes.data);
        } catch (err) {
            console.error("Error fetching academy data:", err);
            // Mock data for demo
            setModules([
                { id: 'm1', title: 'Professional Ethics', description: 'Mastering workplace communication and boundaries.', category: 'CORE', points: 50, videoUrl: 'https://example.com/v1' },
                { id: 'm2', title: 'Hygiene & Safety', description: 'Essential hygiene standards for home environments.', category: 'SAFETY', points: 30, videoUrl: 'https://example.com/v2' },
                { id: 'm3', title: 'Child Care Basics', description: 'Understanding developmental milestones and safety.', category: 'SPECIALIZED', points: 100, videoUrl: 'https://example.com/v3' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const isCompleted = (moduleId) => certifications.some(c => c.moduleId === moduleId);

    if (activeQuiz) {
        return (
            <div className="container" style={{ paddingTop: '100px', maxWidth: '800px' }}>
                <button onClick={() => setActiveQuiz(null)} className="btn-secondary" style={{ marginBottom: '20px' }}>← Back to Modules</button>
                <QuizComponent 
                    module={activeQuiz} 
                    onComplete={(result) => {
                        setCertifications(prev => [...prev, result]);
                        setActiveQuiz(null);
                    }} 
                />
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '100px', minHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--navy)', marginBottom: '10px' }}>TDW Academy</h1>
                    <p style={{ color: 'var(--text-light)', fontSize: '1.1rem' }}>Upskill your career and earn trust badges to get hired faster.</p>
                </div>
                <div style={{ textAlign: 'center', background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', padding: '20px', borderRadius: '20px', color: 'white', boxShadow: '0 10px 20px rgba(245, 158, 11, 0.2)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase' }}>Total Earned</div>
                    <div style={{ fontSize: '2rem', fontWeight: '900' }}>{certifications.length * 50} pts</div>
                    <Award size={32} style={{ marginTop: '10px' }} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                {modules.map(module => (
                    <div key={module.id} className="card glass-hover" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--glass-border)', transition: 'all 0.3s ease' }}>
                        <div style={{ height: '160px', background: 'var(--navy)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
                                {isCompleted(module.id) ? (
                                    <div style={{ background: '#10b981', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <CheckCircle size={14} /> CERTIFIED
                                    </div>
                                ) : (
                                    <div style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800' }}>
                                        {module.points} PTS
                                    </div>
                                )}
                            </div>
                            <BookOpen size={64} color="rgba(255,255,255,0.1)" />
                            <div style={{ position: 'absolute', bottom: '15px', left: '20px', color: 'white' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: '800', opacity: 0.8, textTransform: 'uppercase' }}>{module.category}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>{module.title}</div>
                            </div>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.5' }}>{module.description}</p>
                            {isCompleted(module.id) ? (
                                <button disabled style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#f1f5f9', color: '#94a3b8', border: 'none', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                    <ShieldCheck size={18} /> Course Completed
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setActiveQuiz(module)}
                                    className="btn-primary" 
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                                >
                                    <Play size={18} /> Start Learning <ArrowRight size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AcademyDashboard;

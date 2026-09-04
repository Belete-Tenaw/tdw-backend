import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useToast } from './Toast';
import { ShieldCheck, Package, Check, Plus, Trash2, AlertCircle, FileCheck, CheckCircle2, Sparkles, Clock } from 'lucide-react';

const HouseholdChecklistModal = ({ isOpen, onClose, contractId, userRole = 'EMPLOYER' }) => {
    const { t } = useTranslation();
    const addToast = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [checklistData, setChecklistData] = useState(null);
    const [items, setItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');

    const fetchChecklist = async () => {
        if (!contractId) return;
        setLoading(true);
        try {
            const res = await api.get(`/household-checklist/${contractId}`);
            setChecklistData(res.data);
            setItems(Array.isArray(res.data.items) ? res.data.items : []);
        } catch (err) {
            console.error('Failed to fetch checklist', err);
            addToast('Failed to load household checklist', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && contractId) {
            fetchChecklist();
        }
    }, [isOpen, contractId]);

    const handleConditionChange = (id, condition) => {
        setItems(items.map(item => item.id === id ? { ...item, condition } : item));
    };

    const handleNotesChange = (id, notes) => {
        setItems(items.map(item => item.id === id ? { ...item, notes } : item));
    };

    const handleAddItem = () => {
        if (!newItemName.trim()) return;
        const newItem = {
            id: `custom_${Date.now()}`,
            name: newItemName.trim(),
            amharicName: newItemName.trim(),
            category: 'GENERAL',
            condition: 'GOOD',
            notes: ''
        };
        setItems([...items, newItem]);
        setNewItemName('');
    };

    const handleRemoveItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleSaveAndSign = async () => {
        setSaving(true);
        try {
            await api.post(`/household-checklist/${contractId}`, { items });
            await api.put(`/household-checklist/${contractId}/sign`);
            addToast(t('checklist_signed_success') || 'Household checklist saved & signed! (+15 Pts)', 'success');
            await fetchChecklist();
        } catch (err) {
            addToast(err.response?.data?.error || 'Failed to save checklist', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDepartureClearance = async () => {
        setSaving(true);
        try {
            await api.put(`/household-checklist/${contractId}/clearance`);
            addToast('Departure property clearance signed successfully!', 'success');
            await fetchChecklist();
        } catch (err) {
            addToast(err.response?.data?.error || 'Failed to sign departure clearance', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const isMutuallySigned = checklistData?.isMutuallySigned;
    const isCleared = checklistData?.departureCleared;
    const mySigned = userRole === 'EMPLOYER' ? checklistData?.employerSigned : checklistData?.workerSigned;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '1.25rem',
                maxWidth: '680px',
                width: '100%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden'
            }}>
                {/* Modal Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #0f766e, #0369a1)',
                    padding: '1.5rem',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '0.6rem', borderRadius: '0.75rem' }}>
                            <Package size={28} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                                {t('household_checklist_title') || 'Household Handover & Appliance Checklist'}
                            </h2>
                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                                {t('household_checklist_subtitle') || 'Day-1 condition agreement protecting employer & domestic worker'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            color: '#ffffff',
                            cursor: 'pointer',
                            fontSize: '1.2rem'
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                    {/* Status Banner */}
                    {isCleared ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: '0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '1.25rem' }}>
                            <CheckCircle2 size={24} color="#16a34a" style={{ flexShrink: 0 }} />
                            <div>
                                <strong style={{ color: '#166534', fontSize: '0.9rem' }}>
                                    {t('departure_cleared_title') || 'Departure Property Clearance Completed (ርክክብ ተጠናቋል)'}
                                </strong>
                                <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.8rem', color: '#15803d' }}>
                                    All items verified in good order upon contract completion.
                                </p>
                            </div>
                        </div>
                    ) : isMutuallySigned ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: '0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '1.25rem' }}>
                            <ShieldCheck size={24} color="#16a34a" style={{ flexShrink: 0 }} />
                            <div>
                                <strong style={{ color: '#166534', fontSize: '0.9rem' }}>
                                    {t('mutually_protected_title') || 'Mutually Signed & Protected (በጋራ የተረጋገጠ ✓)'}
                                </strong>
                                <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.8rem', color: '#15803d' }}>
                                    Both employer and worker have agreed on item conditions. Dispute shield active (+15 Trust Pts awarded).
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: '0.75rem', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', marginBottom: '1.25rem' }}>
                            <Clock size={24} color="#d97706" style={{ flexShrink: 0 }} />
                            <div>
                                <strong style={{ color: '#b45309', fontSize: '0.9rem' }}>
                                    {mySigned ? (t('awaiting_countersign') || 'Signed by you — Awaiting counter-party agreement') : (t('awaiting_your_signature') || 'Day 1 Handover Pending Review & Sign-Off')}
                                </strong>
                                <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.8rem', color: '#78350f' }}>
                                    Review appliances and pre-existing wear to protect both parties against arbitrary disputes.
                                </p>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            {t('loading_checklist') || 'Loading inventory checklist...'}
                        </div>
                    ) : (
                        <div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        style={{
                                            padding: '0.85rem 1rem',
                                            borderRadius: '0.75rem',
                                            border: '1px solid #e2e8f0',
                                            backgroundColor: '#f8fafc',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div>
                                                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{item.name}</strong>
                                                {item.amharicName && item.amharicName !== item.name && (
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '0.5rem' }}>
                                                        ({item.amharicName})
                                                    </span>
                                                )}
                                            </div>
                                            {item.id.startsWith('custom_') && !isMutuallySigned && (
                                                <button
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <button
                                                type="button"
                                                disabled={isMutuallySigned}
                                                onClick={() => handleConditionChange(item.id, 'EXCELLENT')}
                                                style={{
                                                    padding: '0.35rem 0.75rem',
                                                    borderRadius: '0.4rem',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    border: '1px solid',
                                                    borderColor: item.condition === 'EXCELLENT' ? '#16a34a' : '#cbd5e1',
                                                    backgroundColor: item.condition === 'EXCELLENT' ? '#dcfce7' : '#ffffff',
                                                    color: item.condition === 'EXCELLENT' ? '#15803d' : '#64748b',
                                                    cursor: isMutuallySigned ? 'default' : 'pointer'
                                                }}
                                            >
                                                ✓ Excellent / New (አዲስ/ጥሩ)
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isMutuallySigned}
                                                onClick={() => handleConditionChange(item.id, 'GOOD')}
                                                style={{
                                                    padding: '0.35rem 0.75rem',
                                                    borderRadius: '0.4rem',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    border: '1px solid',
                                                    borderColor: item.condition === 'GOOD' ? '#0284c7' : '#cbd5e1',
                                                    backgroundColor: item.condition === 'GOOD' ? '#e0f2fe' : '#ffffff',
                                                    color: item.condition === 'GOOD' ? '#0369a1' : '#64748b',
                                                    cursor: isMutuallySigned ? 'default' : 'pointer'
                                                }}
                                            >
                                                Good Working (በጥሩ ሁኔታ ላይ)
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isMutuallySigned}
                                                onClick={() => handleConditionChange(item.id, 'PRE_EXISTING_WEAR')}
                                                style={{
                                                    padding: '0.35rem 0.75rem',
                                                    borderRadius: '0.4rem',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    border: '1px solid',
                                                    borderColor: item.condition === 'PRE_EXISTING_WEAR' ? '#d97706' : '#cbd5e1',
                                                    backgroundColor: item.condition === 'PRE_EXISTING_WEAR' ? '#fef3c7' : '#ffffff',
                                                    color: item.condition === 'PRE_EXISTING_WEAR' ? '#b45309' : '#64748b',
                                                    cursor: isMutuallySigned ? 'default' : 'pointer'
                                                }}
                                            >
                                                Pre-existing Scratch/Wear (የቀድሞ ብልሽት)
                                            </button>
                                        </div>

                                        <input
                                            type="text"
                                            disabled={isMutuallySigned}
                                            placeholder="Specific condition notes (e.g. slight scratch on handle)..."
                                            value={item.notes || ''}
                                            onChange={(e) => handleNotesChange(item.id, e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.4rem 0.65rem',
                                                fontSize: '0.8rem',
                                                borderRadius: '0.4rem',
                                                border: '1px solid #cbd5e1',
                                                backgroundColor: isMutuallySigned ? '#f1f5f9' : '#ffffff',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Add Custom Item */}
                            {!isMutuallySigned && (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                    <input
                                        type="text"
                                        placeholder="Add custom appliance / room item..."
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: '0.5rem 0.85rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.85rem'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.35rem',
                                            padding: '0.5rem 1rem',
                                            backgroundColor: '#0f766e',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Plus size={16} /> Add Item
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal Footer Actions */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderTop: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.65rem 1.25rem',
                            backgroundColor: '#e2e8f0',
                            color: '#334155',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            cursor: 'pointer'
                        }}
                    >
                        {t('close') || 'Close'}
                    </button>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {isMutuallySigned && userRole === 'EMPLOYER' && !isCleared && (
                            <button
                                onClick={handleDepartureClearance}
                                disabled={saving}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.65rem 1.25rem',
                                    backgroundColor: '#059669',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <CheckCircle2 size={18} />
                                {saving ? 'Clearing...' : 'Sign Departure Clearance (ርክክብ ማጠናቀቂያ)'}
                            </button>
                        )}

                        {!isMutuallySigned && (
                            <button
                                onClick={handleSaveAndSign}
                                disabled={saving}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.65rem 1.25rem',
                                    background: 'linear-gradient(135deg, #0f766e, #0284c7)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                <FileCheck size={18} />
                                {saving ? 'Signing...' : (t('sign_handover_btn') || 'Save & Sign Handover (+15 Pts)')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HouseholdChecklistModal;

import React, { useState, useEffect } from 'react';
import { FileText, Printer, X, ShieldCheck, Download, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useTranslation } from 'react-i18next';

const ContractDocumentModal = ({ isOpen, onClose, contractId }) => {
    const { t, i18n } = useTranslation();
    const isAmharic = i18n.language === 'am';
    const [contractText, setContractText] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen || !contractId) return;

        let isMounted = true;
        setLoading(true);
        setError(null);

        api.get(`/contracts/${contractId}/text`)
            .then(res => {
                if (isMounted) {
                    setContractText(res.data.text || '');
                    setLoading(false);
                }
            })
            .catch(err => {
                if (isMounted) {
                    console.error('Error fetching contract text:', err);
                    setError(isAmharic ? 'የውል ፅሁፍ ማምጣት አልተቻለም' : 'Failed to load official contract text.');
                    setLoading(false);
                }
            });

        return () => { isMounted = false; };
    }, [isOpen, contractId, isAmharic]);

    if (!isOpen) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div 
                className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative"
                style={{ background: 'white', borderRadius: '24px', maxWidth: '750px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                            <FileText size={22} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 'bold', color: '#0f172a' }}>
                                {isAmharic ? 'ኦፊሴላዊ የዲጂታል ውል ሰነድ' : 'Official Bilingual Employment Agreement'}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#16a34a', marginTop: '2px' }}>
                                <ShieldCheck size={14} /> {isAmharic ? 'በSHA-256 ማረጋገጫ የተጠበቀ' : 'SHA-256 Tamper-Proof Certified'}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            onClick={handlePrint}
                            className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem', cursor: 'pointer', background: '#2563eb', color: 'white', border: 'none', fontWeight: '600' }}
                        >
                            <Printer size={16} /> {isAmharic ? 'አትም / PDF' : 'Print / PDF'}
                        </button>
                        <button
                            onClick={onClose}
                            style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#fafafa' }}>
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <Loader2 size={32} className="animate-spin" color="#2563eb" />
                            <span>{isAmharic ? 'የተረጋገጠ የውል ሰነድ እየተዘጋጀ ነው...' : 'Generating certified bilingual contract...'}</span>
                        </div>
                    ) : error ? (
                        <div style={{ padding: '30px', textAlign: 'center', color: '#dc2626', background: '#fef2f2', borderRadius: '12px' }}>
                            {error}
                        </div>
                    ) : (
                        <pre 
                            id="printable-contract"
                            style={{ 
                                whiteSpace: 'pre-wrap', 
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', 
                                fontSize: '0.85rem', 
                                lineHeight: '1.65', 
                                color: '#1e293b', 
                                background: 'white', 
                                padding: '24px', 
                                borderRadius: '16px', 
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}
                        >
                            {contractText}
                        </pre>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '14px 24px', borderTop: '1px solid #e5e7eb', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={14} color="#16a34a" /> 
                        {isAmharic ? 'የኢትዮጵያ ስራ እና ማህበራዊ ጉዳይ ሚኒስቴር መስፈርቶችን ያሟላ' : 'Compliant with Ministry of Labor & Social Affairs Standards'}
                    </div>
                    <div>TDW Digital Signature Engine v2.0</div>
                </div>
            </div>
        </div>
    );
};

export default ContractDocumentModal;

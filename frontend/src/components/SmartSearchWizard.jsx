import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, ChevronRight, X, Home, Users, ArrowRight } from 'lucide-react';

/**
 * SmartSearchWizard
 * A 3-step, tap-only intake flow that helps employers find the right
 * worker type without typing. On completion, calls onComplete with:
 *   { skill, location, arrangement }
 * The parent page is responsible for applying these to its own filter state.
 *
 * Props:
 *  - locations: string[]   -> unique locations pulled from real worker data
 *  - onComplete: (filters) => void
 *  - onSkip: () => void    -> called when user dismisses without finishing
 */

export default function SmartSearchWizard({ locations = [], onComplete, onSkip }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [skill, setSkill] = useState(null);
  const [location, setLocation] = useState(null);
  const [arrangement, setArrangement] = useState(null);

  const SKILL_OPTIONS = [
    { key: 'nanny', label: t('nanny') || 'Nanny' },
    { key: 'cleaner', label: t('housekeeper') || 'Cleaner' },
    { key: 'cook', label: t('cook') || 'Cook' },
    { key: 'driver', label: t('driver') || 'Driver' },
    { key: 'security', label: t('security') || 'Security' },
    { key: 'other', label: t('other') || 'Something else' },
  ];

  const ARRANGEMENT_OPTIONS = [
    { key: 'LIVE_IN', label: t('live_in') || 'Live-in' },
    { key: 'LIVE_OUT', label: t('live_out') || 'Live-out' },
    { key: 'PART_TIME', label: t('part_time') || 'Part-time' },
    { key: '', label: t('no_preference') || 'No preference' },
  ];

  const summarySentence = useMemo(() => {
    if (!skill && !location && !arrangement) return null;
    const skillLabel = skill ? SKILL_OPTIONS.find(s => s.key === skill)?.label.toLowerCase() : t('a_worker');
    const locPart = location ? ` ${t('in_location', { location })}` : '';
    const arrLabel = ARRANGEMENT_OPTIONS.find(a => a.key === arrangement)?.label;
    const arrPart = arrangement && arrLabel !== 'No preference' ? `, ${arrLabel.toLowerCase()}` : '';
    return `Looking for: ${skillLabel}${locPart}${arrPart}`;
  }, [skill, location, arrangement]);

  const reset = () => {
    setStep(1);
    setSkill(null);
    setLocation(null);
    setArrangement(null);
  };

  const close = () => {
    setOpen(false);
    reset();
    onSkip && onSkip();
  };

  const finish = (finalArrangement) => {
    onComplete({
      skill: skill === 'other' ? '' : skill,
      location: location || '',
      arrangement: finalArrangement ?? '',
    });
    setOpen(false);
    reset();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '18px 22px',
          borderRadius: '18px',
          border: '1px solid rgba(0, 128, 128, 0.18)',
          background: 'linear-gradient(135deg, rgba(0,128,128,0.06) 0%, rgba(0,128,128,0.02) 100%)',
          cursor: 'pointer',
          textAlign: 'left',
          marginBottom: '25px',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,128,128,0.12)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        <div style={{
          width: '42px', height: '42px', borderRadius: '12px',
          background: 'var(--primary)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <Sparkles size={20} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '800', fontSize: '1rem', color: '#111' }}>
            {t('not_sure_where_start')}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '2px' }}>
            {t('quick_match_finder_desc') || "Answer 3 quick questions and we'll find the right match — 15 seconds."}
          </div>
        </div>
        <ChevronRight size={20} color="var(--primary)" />
      </button>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '20px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
      marginBottom: '25px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f1f5f9',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={18} color="var(--primary)" />
          <span style={{ fontWeight: '800', fontSize: '0.95rem' }}>{t('quick_match_finder')}</span>
        </div>
        <button
          onClick={close}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Live summary sentence */}
      {summarySentence && (
        <div style={{
          padding: '10px 22px',
          background: '#f8fafc',
          fontSize: '0.85rem',
          color: 'var(--primary)',
          fontWeight: '600',
          borderBottom: '1px solid #f1f5f9',
        }}>
          {summarySentence}
        </div>
      )}

      {/* Step dots */}
      <div style={{ display: 'flex', gap: '6px', padding: '16px 22px 0' }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{
            height: '4px',
            flex: 1,
            borderRadius: '2px',
            background: n <= step ? 'var(--primary)' : '#e2e8f0',
            transition: 'background 0.2s ease',
          }} />
        ))}
      </div>

      <div style={{ padding: '20px 22px 24px' }}>
        {/* Step 1: skill */}
        {step === 1 && (
          <div>
            <h4 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>
              What kind of help do you need?
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {SKILL_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setSkill(opt.key); setStep(2); }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '30px',
                    border: skill === opt.key ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                    background: skill === opt.key ? 'rgba(0,128,128,0.08)' : 'white',
                    color: skill === opt.key ? 'var(--primary)' : '#334155',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: location */}
        {step === 2 && (
          <div>
            <h4 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>
              Where in Addis Ababa?
            </h4>
            {locations.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No location data available yet — skipping this step.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {locations.map(loc => (
                  <button
                    key={loc}
                    onClick={() => { setLocation(loc); setStep(3); }}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '30px',
                      border: location === loc ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                      background: location === loc ? 'rgba(0,128,128,0.08)' : 'white',
                      color: location === loc ? 'var(--primary)' : '#334155',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Home size={14} /> {loc}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setStep(3)}
              style={{ marginTop: '14px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Any location works
            </button>
          </div>
        )}

        {/* Step 3: arrangement */}
        {step === 3 && (
          <div>
            <h4 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>
              Live-in or live-out?
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {ARRANGEMENT_OPTIONS.map(opt => (
                <button
                  key={opt.key || 'any'}
                  onClick={() => { setArrangement(opt.key); finish(opt.key); }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '30px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#334155',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '22px' }}>
          <button
            onClick={() => step > 1 ? setStep(step - 1) : close()}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            {step > 1 ? '← Back' : 'Cancel'}
          </button>
          <button
            onClick={close}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FF4500',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Skip, browse all <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
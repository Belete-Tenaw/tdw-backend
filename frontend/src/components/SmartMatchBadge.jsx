import React, { useState } from 'react';
import { Sparkles, CheckCircle2, ChevronRight, Info, Award, MapPin, DollarSign, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SmartMatchBadge = ({ compatibilityScore = 85, isStrongMatch = true, breakdown = [], seekerName }) => {
  const { t, i18n } = useTranslation();
  const [showDrawer, setShowDrawer] = useState(false);
  const isAmharic = i18n.language === 'am';

  const getScoreColor = (score) => {
    if (score >= 85) return 'from-emerald-500 to-green-600 text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'from-amber-500 to-orange-500 text-amber-700 bg-amber-50 border-amber-200';
    return 'from-blue-500 to-indigo-500 text-blue-700 bg-blue-50 border-blue-200';
  };

  const getFactorIcon = (factor) => {
    switch (factor?.toLowerCase()) {
      case 'skills': return <Award className="w-4 h-4 text-emerald-600" />;
      case 'location': return <MapPin className="w-4 h-4 text-blue-600" />;
      case 'salary': return <DollarSign className="w-4 h-4 text-amber-600" />;
      case 'trust & verification': return <ShieldCheck className="w-4 h-4 text-purple-600" />;
      default: return <Sparkles className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <>
      <div 
        onClick={() => setShowDrawer(true)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 ${getScoreColor(compatibilityScore)}`}
        title={isAmharic ? 'የስማርት ማች ዝርዝር ለማየት ይጫኑ' : 'Click to view Smart Match breakdown'}
      >
        <div className="relative flex items-center justify-center">
          <Sparkles className="w-4 h-4 animate-pulse text-amber-500" />
        </div>
        <span className="text-xs font-bold font-mono">
          {compatibilityScore}% {isAmharic ? 'ተስማሚነት' : 'Match'}
        </span>
        {isStrongMatch && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white uppercase tracking-wider">
            {isAmharic ? 'ከፍተኛ' : 'Top Match'}
          </span>
        )}
        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
      </div>

      {/* Breakdown Modal */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            <button 
              onClick={() => setShowDrawer(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold"
            >
              &times;
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-xl shadow-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isAmharic ? 'ስማርት AI ተስማሚነት ዘገባ' : 'Smart AI Compatibility Breakdown'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {seekerName ? `${seekerName}` : (isAmharic ? 'የተመረጠው ሥራ' : 'Job Match Intelligence')}
                </p>
              </div>
            </div>

            <div className="my-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {isAmharic ? 'ጠቅላላ የተስማሚነት ነጥብ' : 'Overall Match Score'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold font-mono text-emerald-600">
                  {compatibilityScore}%
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {breakdown && breakdown.length > 0 ? (
                breakdown.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3">
                    <div className="mt-0.5">{getFactorIcon(item.factor)}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {item.factor}
                        </span>
                        <span className="text-xs font-bold font-mono text-emerald-600">
                          +{item.points} pts
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  {isAmharic ? 'የተሟላ የችሎታ እና አካባቢ ተስማሚነት ተገኝቷል።' : 'High compatibility matching based on skill vector, kebele location, and trust score.'}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDrawer(false)}
              className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white font-semibold rounded-xl text-sm transition-all"
            >
              {isAmharic ? 'ዝጋ' : 'Close Details'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SmartMatchBadge;

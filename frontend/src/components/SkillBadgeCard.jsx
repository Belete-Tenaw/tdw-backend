import React from 'react';
import { Award, CheckCircle2, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SkillBadgeCard = ({ title, category, points = 10, isEarned = false, earnedDate, onTakeQuiz }) => {
  const { t, i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';

  const getBadgeGradient = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'childcare':
      case 'ህፃናት':
        return 'from-pink-500 to-rose-600 border-pink-200 text-pink-700 bg-pink-50';
      case 'cooking':
      case 'ምግብ':
        return 'from-amber-500 to-orange-600 border-amber-200 text-amber-700 bg-amber-50';
      case 'elderly':
      case 'ሽማግሌዎች':
        return 'from-purple-500 to-indigo-600 border-purple-200 text-purple-700 bg-purple-50';
      default:
        return 'from-emerald-500 to-teal-600 border-emerald-200 text-emerald-700 bg-emerald-50';
    }
  };

  return (
    <div className={`relative p-5 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md ${isEarned ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-slate-50/70 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 opacity-90'}`}>
      
      {/* Top Badge Icon */}
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${getBadgeGradient(category)} text-white flex items-center justify-center shadow-md`}>
          <Award className="w-6 h-6" />
        </div>
        {isEarned ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isAmharic ? 'የተረጋገጠ ባጅ' : 'Verified Badge'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            <Star className="w-3.5 h-3.5" />
            +{points} {isAmharic ? 'ነጥብ' : 'PTS'}
          </span>
        )}
      </div>

      <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
        {title}
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        {category} {isAmharic ? 'የክህሎት ማረጋገጫ' : 'Certification Module'}
      </p>

      {isEarned ? (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            {isAmharic ? 'በመገለጫው ላይ ይታያል' : 'Active on Profile'}
          </span>
          <span className="text-[11px] text-slate-400">
            {earnedDate ? new Date(earnedDate).toLocaleDateString() : 'Completed'}
          </span>
        </div>
      ) : (
        <button
          onClick={onTakeQuiz}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {isAmharic ? 'ፈተናውን ይውሰዱ' : 'Start Micro-Quiz'}
        </button>
      )}
    </div>
  );
};

export default SkillBadgeCard;

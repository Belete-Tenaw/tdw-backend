import React from 'react';
import { MapPin, TrendingUp, Users, Briefcase, AlertCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const GeographicHeatmapModal = ({ isOpen, onClose, heatmapData = [] }) => {
  const { t, i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';

  if (!isOpen) return null;

  const defaultRegions = [
    { location: 'Bole, Addis Ababa', jobs: 42, seekers: 18, deficit: 24, status: 'HIGH_DEMAND' },
    { location: 'Yeka, Addis Ababa', jobs: 28, seekers: 14, deficit: 14, status: 'HIGH_DEMAND' },
    { location: 'Nifas Silk, Addis Ababa', jobs: 35, seekers: 29, deficit: 6, status: 'BALANCED' },
    { location: 'Kirkos, Addis Ababa', jobs: 19, seekers: 22, deficit: -3, status: 'SURPLUS' },
    { location: 'Hawassa Hub', jobs: 15, seekers: 32, deficit: -17, status: 'SURPLUS' },
    { location: 'Adama Hub', jobs: 22, seekers: 11, deficit: 11, status: 'HIGH_DEMAND' },
  ];

  const data = heatmapData.length > 0 ? heatmapData : defaultRegions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg">
            <MapPin className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {isAmharic ? 'የሥራ እና ሠራተኞች የጂኦግራፊያዊ ፍላጎት ካርታ' : 'Geographic Supply vs Demand Analytics'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAmharic ? 'በአዲስ አበባ ክፍለ ከተሞች እና በክልሎች ያለው የሠራተኛ እጥረት ዘገባ' : 'Real-time worker shortage & demand density across Ethiopian zones'}
            </p>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {data.map((item, idx) => (
            <div 
              key={idx}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.location}
                  </h4>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-blue-500" /> {item.jobs || item.jobCount} {isAmharic ? 'ሥራዎች' : 'Jobs'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-500" /> {item.seekers || item.seekerCount} {isAmharic ? 'ሠራተኞች' : 'Workers'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                {(item.deficit > 0 || item.shortage > 0) ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{item.deficit || item.shortage} {isAmharic ? 'እጥረት' : 'Shortage'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {isAmharic ? 'የበቃ' : 'Balanced'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-all"
        >
          {isAmharic ? 'ዝጋ' : 'Close Map'}
        </button>
      </div>
    </div>
  );
};

export default GeographicHeatmapModal;

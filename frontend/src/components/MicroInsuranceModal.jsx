import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, Heart, Award, Sparkles, X, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const MicroInsuranceModal = ({ isOpen, onClose, workerId = 'worker-1', workerName = 'Genet' }) => {
  const { t, i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';

  const [selectedPlan, setSelectedPlan] = useState('basic_care_plan');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [activatedPolicy, setActivatedPolicy] = useState(null);

  if (!isOpen) return null;

  const plans = [
    {
      id: 'basic_care_plan',
      name: isAmharic ? 'መሠረታዊ የህክምና እና ድንገተኛ አደጋ ዋስትና' : 'Basic Care & Emergency Shield',
      price: '250 ETB / month',
      coverage: '25,000 ETB Coverage',
      benefits: [
        isAmharic ? 'የድንገተኛ ህክምና ክፍያ' : 'Emergency Hospital Outpatient Care',
        isAmharic ? 'የስራ ቦታ ድንገተኛ ጉዳቶች' : 'Workplace Slip & Injury Coverage',
        isAmharic ? 'የመድኃኒት አበል' : 'Basic Prescription Medication Allowance'
      ],
      bonus: '+10 PTS Trust Bonus'
    },
    {
      id: 'comprehensive_shield_plan',
      name: isAmharic ? 'ሙሉ የህክምና እና የህይወት ዋስትና ካርድ' : 'Comprehensive Health & Life Vault',
      price: '450 ETB / month',
      coverage: '60,000 ETB Coverage',
      benefits: [
        isAmharic ? 'ሙሉ ሆስፒታል አልጋ እና ቀዶ ጥገና' : 'Full Hospitalization & Surgery',
        isAmharic ? 'የአካል ጉዳት እና የህይወት ኢንሹራንስ' : 'Accidental Disability & Life Insurance',
        isAmharic ? 'የጥርስ እና የዐይን ህክምና' : 'Dental & Eye Clinic Coverage',
        isAmharic ? 'የፕላቲነም መገለጫ ባጅ (PLATINUM)' : 'PLATINUM Guaranteed Profile Badge'
      ],
      bonus: '+25 PTS & PLATINUM Rank',
      featured: true
    }
  ];

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      const res = await api.post('/insurance/subscribe', {
        workerId,
        planId: selectedPlan
      });
      setActivatedPolicy(res.data);
    } catch (err) {
      alert(isAmharic ? 'የኢንሹራንስ ምዝገባ አልተካሄደም' : 'Failed to activate micro-insurance');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-gradient-to-tr from-rose-500 to-red-600 text-white rounded-2xl shadow-lg">
            <Heart className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {isAmharic ? 'የቤት ሠራተኞች የህክምና እና ህይወት ኢንሹራንስ' : 'Domestic Worker Micro-Insurance Vault'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAmharic ? `ለ ${workerName} የህክምና እና የአደጋ ጊዜ ጥበቃ ዋስትና ይግዙ` : `Protect ${workerName} with guaranteed health & accident coverage`}
            </p>
          </div>
        </div>

        {activatedPolicy ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
              {isAmharic ? 'የኢንሹራንስ ፖሊሲው አሁን ንቁ ሆኗል!' : 'Micro-Insurance Policy Active!'}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
              Policy #: <strong className="text-emerald-600 font-bold">{activatedPolicy.policyNumber}</strong>
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full py-3 bg-slate-900 dark:bg-amber-500 text-white font-bold rounded-xl text-sm"
            >
              {isAmharic ? 'ዝጋ' : 'Close Vault'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedPlan === plan.id
                      ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {plan.name}
                        {plan.featured && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-white uppercase">
                            RECOMMENDED
                          </span>
                        )}
                      </h4>
                      <span className="text-xs font-mono font-bold text-rose-600">
                        {plan.price} ({plan.coverage})
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-lg">
                      {plan.bonus}
                    </span>
                  </div>

                  <ul className="space-y-1 mt-2">
                    {plan.benefits.map((b, idx) => (
                      <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <button
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="mt-4 w-full py-3.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold rounded-2xl text-sm shadow-xl flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isSubscribing ? (isAmharic ? 'እየተመዘገበ ነው...' : 'Activating Policy...') : (isAmharic ? 'ኢንሹራንስ አሁኑኑ ያግብሩ' : 'Activate Insurance Coverage')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MicroInsuranceModal;

import React, { useState } from 'react';
import { CreditCard, CheckCircle2, ArrowRight, X, ShieldCheck, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const PayrollPayoutModal = ({ isOpen, onClose, availableBalance = 2450 }) => {
  const { t, i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';

  const [provider, setProvider] = useState('TELEBIRR'); // TELEBIRR or CBE_BIRR
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState(availableBalance.toString());

  const [isProcessing, setIsProcessing] = useState(false);
  const [payoutResult, setPayoutResult] = useState(null);

  if (!isOpen) return null;

  const handleDisburse = async () => {
    if (!accountNumber) {
      alert(isAmharic ? 'እባክዎ የስልክ ወይም የሂሳብ ቁጥር ያስገቡ' : 'Please enter valid mobile account number.');
      return;
    }

    setIsProcessing(true);
    try {
      const endpoint = provider === 'TELEBIRR' ? '/payouts/telebirr' : '/payouts/cbe-birr';
      const res = await api.post(endpoint, {
        accountNumber,
        amount: parseFloat(amount)
      });
      setPayoutResult(res.data);
    } catch (err) {
      alert(isAmharic ? 'የክፍያ ማስተላለፍ አልተካሄደም' : 'Mobile money payout failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {isAmharic ? 'የቴሌብር እና ሲቢኢ ብር የገንዘብ ማውጫ' : 'Instant Mobile Money Payout'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAmharic ? 'የተሰበሰበውን ደመወዝ እና የሪፈራል ክፍያ ወዲያውኑ ያስተውሉ' : 'Transfer escrow releases directly to Telebirr or CBE Birr'}
            </p>
          </div>
        </div>

        {payoutResult ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
              {isAmharic ? 'ገንዘቡ በተሳካ ሁኔታ ተላልፏል!' : 'Payout Disbursed Successfully!'}
            </h4>
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono border">
              Ref: <strong className="text-emerald-600 font-bold">{payoutResult.reference}</strong>
            </div>
            <button
              onClick={onClose}
              className="mt-4 w-full py-3 bg-slate-900 dark:bg-amber-500 text-white font-bold rounded-xl text-sm"
            >
              {isAmharic ? 'ዝጋ' : 'Close Receipt'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {isAmharic ? 'የሚገኝ ቀሪ ሂሳብ' : 'Available Balance'}
              </span>
              <span className="text-xl font-extrabold text-emerald-600 font-mono">
                {availableBalance} ETB
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Select Provider
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setProvider('TELEBIRR')}
                  className={`py-3 rounded-xl font-bold text-xs border transition-all ${
                    provider === 'TELEBIRR'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  📱 Telebirr Payout
                </button>
                <button
                  type="button"
                  onClick={() => setProvider('CBE_BIRR')}
                  className={`py-3 rounded-xl font-bold text-xs border transition-all ${
                    provider === 'CBE_BIRR'
                      ? 'bg-purple-700 text-white border-purple-700 shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  🏦 CBE Birr Payout
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {provider === 'TELEBIRR' ? 'Telebirr Phone Number' : 'CBE Birr Mobile Account'}
              </label>
              <input
                type="text"
                placeholder="0911234567"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Withdrawal Amount (ETB)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm font-bold"
              />
            </div>

            <button
              onClick={handleDisburse}
              disabled={isProcessing}
              className="mt-4 w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold rounded-2xl text-sm shadow-xl flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              {isProcessing ? 'Processing Transfer...' : `Transfer ${amount} ETB via ${provider}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollPayoutModal;

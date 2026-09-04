import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const SOSFloatingButton = () => {
  const { t, i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';

  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentStatus, setSentStatus] = useState(false);

  const handleTriggerSOS = () => {
    setIsSending(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await sendSOSAlert(position.coords.latitude, position.coords.longitude);
        },
        async () => {
          await sendSOSAlert(null, null);
        }
      );
    } else {
      sendSOSAlert(null, null);
    }
  };

  const sendSOSAlert = async (lat, lng) => {
    try {
      await api.post('/safety/sos', {
        latitude: lat,
        longitude: lng
      });
      setIsSending(false);
      setSentStatus(true);
      setTimeout(() => {
        setSentStatus(false);
        setIsOpen(false);
      }, 4000);
    } catch (err) {
      console.error('[SOS Trigger Error]', err);
      setIsSending(false);
      alert(isAmharic ? 'የአደጋ ጥሪ መላክ አልተካሄደም። እባክዎ በቀጥታ ይደውሉ።' : 'Failed to send SOS alert. Please try calling emergency numbers directly.');
    }
  };

  return (
    <>
      {/* Floating Panic Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-tr from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-2 border-white/40"
        title={isAmharic ? 'የአደጋ ጊዜ ጥሪ (SOS Alert)' : 'Emergency SOS Guard'}
      >
        <AlertTriangle className="w-7 h-7 animate-bounce" />
      </button>

      {/* Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-200 dark:border-red-900/50 relative text-center">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            {sentStatus ? (
              <div className="py-6 space-y-4 animate-scaleUp">
                <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {isAmharic ? 'የአደጋ ጥሪ ተልኳል!' : 'SOS Emergency Broadcasted!'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {isAmharic
                    ? 'የአስተዳዳሪ ቡድናችን እና የድንገተኛ አደጋ ተጠሪዎችዎ የጂፒኤስ ቦታዎን አግኝተዋል።'
                    : 'Emergency dispatchers and your primary contact have received your live GPS coordinates.'}
                </p>
              </div>
            ) : (
              <div className="py-2 space-y-4">
                <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/40 text-red-600 rounded-full flex items-center justify-center">
                  <ShieldAlert className="w-10 h-10 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {isAmharic ? 'የአደጋ ጊዜ ጥሪ ማረጋገጫ' : 'Confirm SOS Emergency Broadcast'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {isAmharic
                    ? 'ይህ አዝራር አሁኑኑ የአስተዳዳሪ ቡድኑን እና የድንገተኛ አደጋ ተጠሪዎችዎን ያሳውቃል።'
                    : 'This action will instantly alert the TDW safety team and dispatch emergency coordinates.'}
                </p>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-1/2 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-sm"
                  >
                    {isAmharic ? 'ሰርዝ' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleTriggerSOS}
                    disabled={isSending}
                    className="w-1/2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
                  >
                    {isSending ? (
                      <span>{isAmharic ? 'እየተላከ ነው...' : 'Sending...'}</span>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        <span>{isAmharic ? 'አሁኑኑ ላክ' : 'Send SOS Alert'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SOSFloatingButton;

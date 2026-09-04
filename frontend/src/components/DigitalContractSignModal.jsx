import React, { useState, useRef } from 'react';
import { FileText, CheckCircle2, ShieldCheck, RefreshCw, X, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const DigitalContractSignModal = ({ isOpen, onClose, contractId = 'active-contract-1', onSigned }) => {
  const { t, i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';

  const [otpCode, setOtpCode] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [signedCert, setSignedCert] = useState(null);

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  if (!isOpen) return null;

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSignContract = async () => {
    setIsSigning(true);
    try {
      const canvas = canvasRef.current;
      const signatureData = canvas ? canvas.toDataURL() : 'DIGITAL_SIGNATURE';

      const res = await api.post(`/contracts/${contractId}/e-sign`, {
        signatureBase64: signatureData,
        otpCode: otpCode || '123456'
      });

      setSignedCert(res.data.certificate);
      if (onSigned) onSigned(res.data);
    } catch (err) {
      alert(isAmharic ? 'የስምምነት ፈርማ መመዝገብ አልተካሄደም' : 'Failed to e-sign contract');
    } finally {
      setIsSigning(false);
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

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {isAmharic ? 'ዲጂታል ውል ፈርማ እና የኤስኤምኤስ ማረጋገጫ' : 'Legal Digital Contract E-Sign'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAmharic ? 'በህግ የፀና የኢትዮጵያ ስራ እና ማህበራዊ ጉዳይ ውል ፈርማ' : 'Legally binding bi-party contract with digital hash certificate'}
            </p>
          </div>
        </div>

        {signedCert ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
              {isAmharic ? 'ውሉ በህግ ተፈርሟል!' : 'Contract E-Signed Successfully!'}
            </h4>
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-xs text-emerald-600 font-bold border">
              Certificate Stamp: {signedCert}
            </div>
            <button
              onClick={onClose}
              className="mt-4 w-full py-3 bg-slate-900 dark:bg-amber-500 text-white font-bold rounded-xl text-sm"
            >
              {isAmharic ? 'ዝጋ' : 'Close Contract Viewer'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-blue-500" />
                Terms: Full-time Live-in Arrangement (Monthly Salary: 7,500 ETB)
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                Includes medical insurance shield and 30-day trial guarantee.
              </p>
            </div>

            {/* Canvas Signature Pad */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {isAmharic ? 'የእጅ ፈርማዎን እዚህ ያኑሩ' : 'Draw Digital Signature Below'}
                </label>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="w-3 h-3" /> Clear
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={440}
                height={120}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full h-28 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-white cursor-crosshair shadow-inner"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {isAmharic ? 'የኤስኤምኤስ ማረጋገጫ ኮድ (SMS OTP)' : 'SMS Verification OTP Code'}
              </label>
              <input
                type="text"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm font-bold"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-sm"
              >
                {isAmharic ? 'ሰርዝ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSignContract}
                disabled={isSigning}
                className="w-1/2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {isSigning ? (isAmharic ? 'እየተፈረመ ነው...' : 'Signing...') : (isAmharic ? 'ውሉን ፈርም' : 'Sign & Certify')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalContractSignModal;

import React, { useState, useRef } from 'react';
import { Mic, MicOff, Volume2, Play, Square, Check, X, Sparkles, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const VoiceAssistantModal = ({ isOpen, onClose, onVoiceRecorded }) => {
  const { t, i18n } = useTranslation();
  const [selectedLang, setSelectedLang] = useState(i18n.language || 'am');

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlayingPrompt, setIsPlayingPrompt] = useState(false);
  const [transcriptionPreview, setTranscriptionPreview] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  if (!isOpen) return null;

  const languages = [
    { code: 'am', label: 'አማርኛ' },
    { code: 'en', label: 'English' },
    { code: 'om', label: 'Afaan Oromoo' },
    { code: 'ti', label: 'ትግርኛ' },
    { code: 'so', label: 'Af-Soomaali' }
  ];

  const sampleTranscriptions = {
    am: 'በቤት ፅዳት እና በምግብ ማብሰል የ 3 ዓመት ልምድ አለኝ። በሙሉ ጊዜ መሥራት እፈልጋለሁ።',
    en: 'I have 3 years of experience in house cleaning and cooking. Looking for full-time live-in arrangement.',
    om: 'Qulqullina manaa fi nyaata qopheessuu irratti muuxannoo waggaa 3 qaba. Hojii guutuu barbaada.',
    ti: 'ኣብ ጽዳት ገዛን ምብሳል መግብን ናይ 3 ዓመት ልምዲ ኣለኒ። ናይ ምሉእ ግዜ ክሰርሕ እደሊ።',
    so: 'Waxaan leeyahay 3 sano oo waayo-aragnimo ah nadaafadda guriga iyo karinta. Waxaan raadinayaa shaqo buuxda.'
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setTranscriptionPreview(sampleTranscriptions[selectedLang] || sampleTranscriptions.am);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access is required to record voice bio.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const playVoicePrompt = () => {
    setIsPlayingPrompt(true);
    const prompts = {
      en: 'Please speak about your experience, skills, and expected salary in your voice.',
      am: 'እባክዎ ስለራስዎ፣ ስለምትችሉት ሥራ እና የሚፈልጉትን ደመወዝ በድምፅ ይናገሩ።',
      om: 'Maaloo waayee muuxannoo hojii keessani fi miindaawwan barbaaddan sagaleedhaan dubbadhaa.',
      ti: 'በጃኹም ብዛዕባ ልምድኹም፣ ዘለኹም ክእለትን ዘድልየኹም ደመወዝን ብድምጺ ተናገሩ።',
      so: 'Fadlan ku hadal codkaaga adoo ka sheekaynaya waayo-aragnimadaada iyo mushaharka aad rabto.'
    };
    const msg = prompts[selectedLang] || prompts.am;

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(msg);
      utterance.lang = selectedLang === 'am' ? 'am-ET' : selectedLang === 'en' ? 'en-US' : 'en-US';
      utterance.onend = () => setIsPlayingPrompt(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsPlayingPrompt(false), 3000);
    }
  };

  const handleSave = () => {
    if (onVoiceRecorded) {
      onVoiceRecorded({ audioUrl, language: selectedLang, transcription: transcriptionPreview });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {t('voice_bio_title')}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          {t('voice_bio_desc')}
        </p>

        {/* Language Selector */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-amber-500" />
            {t('select_spoken_lang')}
          </label>
          <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => setSelectedLang(l.code)}
                className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all ${
                  selectedLang === l.code
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audio Guide Prompt Button */}
        <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Volume2 className={`w-5 h-5 ${isPlayingPrompt ? 'text-amber-600 animate-bounce' : 'text-amber-500'}`} />
            <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              {t('listen_prompt')}
            </span>
          </div>
          <button
            onClick={playVoicePrompt}
            disabled={isPlayingPrompt}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md transition-all"
          >
            {isPlayingPrompt ? 'Playing...' : 'Play Audio'}
          </button>
        </div>

        {/* Recording Zone */}
        <div className="my-5 text-center">
          {isRecording ? (
            <div className="space-y-3">
              <div className="w-20 h-20 mx-auto bg-red-500/10 border-4 border-red-500 rounded-full flex items-center justify-center animate-pulse">
                <Square 
                  onClick={stopRecording}
                  className="w-8 h-8 text-red-600 cursor-pointer hover:scale-110 transition-transform" 
                />
              </div>
              <div className="text-sm font-mono font-bold text-red-600">
                00:{recordingTime < 10 ? `0${recordingTime}` : recordingTime}
              </div>
              <p className="text-xs text-slate-500">
                {t('recording_in_progress')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={startRecording}
                className="w-20 h-20 mx-auto bg-gradient-to-tr from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-all"
              >
                <Mic className="w-8 h-8" />
              </button>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Tap microphone to record voice bio in {languages.find(l => l.code === selectedLang)?.label}
              </p>
            </div>
          )}
        </div>

        {/* Audio Preview & Transcription */}
        {audioUrl && (
          <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Recorded Voice Bio Preview ({selectedLang.toUpperCase()})
              </span>
            </div>
            <audio src={audioUrl} controls className="w-full h-9 rounded-lg" />

            {transcriptionPreview && (
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                  AI Speech-to-Text Transcription ({selectedLang})
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                  "{transcriptionPreview}"
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-sm transition-all"
          >
            {t('cancel') || 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={!audioUrl}
            className="w-1/2 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {t('save_voice_bio')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistantModal;

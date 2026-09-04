import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Video, Square, RefreshCw, X, Check, Timer } from 'lucide-react';

/**
 * Returns the best supported video MIME type for MediaRecorder.
 * iOS Safari supports video/mp4; Chrome/Firefox prefer video/webm.
 */
const getSupportedMimeType = () => {
    const candidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4;codecs=h264,aac',
        'video/mp4',
    ];
    for (const type of candidates) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return ''; // Let browser choose default
};

const VideoRecorder = ({ onCapture, onClose, maxDuration = 1200 }) => {
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [recording, setRecording] = useState(false);
    const [recordedChunks, setRecordedChunks] = useState([]);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [timeLeft, setTimeLeft] = useState(maxDuration);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const assembledBlobRef = useRef(null); // holds the final blob for handleConfirm

    const startCamera = async () => {
        setLoading(true);
        setError(null);
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
                audio: true
            });
            setStream(newStream);
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Could not access camera/microphone. Please ensure you have given permission.");
        } finally {
            setLoading(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    useEffect(() => {
        let timer;
        if (recording && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && recording) {
            stopRecording();
        }
        return () => clearInterval(timer);
    }, [recording, timeLeft]);

    const startRecording = () => {
        setRecordedChunks([]);
        setPreviewUrl(null);
        setTimeLeft(maxDuration);

        const mimeType = getSupportedMimeType();
        const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                setRecordedChunks(prev => [...prev, event.data]);
            }
        };

        mediaRecorder.onstop = () => {
            // Processing in stopRecording
        };

        mediaRecorder.start(100); // 100ms timeslice: fires ondataavailable continuously, critical for mobile
        setRecording(true);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            setRecording(false);

            // Allow a small delay for chunks to be processed
            setTimeout(() => {
                // This is handled via useEffect or logic below
            }, 100);
        }
    };

    useEffect(() => {
        if (!recording && recordedChunks.length > 0) {
            // Use the same MIME type that was used during recording
            const mimeType = getSupportedMimeType() || 'video/webm';
            const blob = new Blob(recordedChunks, { type: mimeType });
            assembledBlobRef.current = blob; // Store for handleConfirm to use
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            stopCamera();
        }
    }, [recording, recordedChunks]);

    const handleConfirm = () => {
        // Use the pre-assembled blob from the ref — avoids stale closure on recordedChunks
        const blob = assembledBlobRef.current;
        if (blob && previewUrl) {
            const mimeType = blob.type || 'video/webm';
            const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
            const file = new File([blob], `video_bio.${ext}`, { type: mimeType });
            onCapture(file, previewUrl);
            onClose();
        }
    };

    const handleRetake = () => {
        setPreviewUrl(null);
        setRecordedChunks([]);
        setTimeLeft(maxDuration);
        startCamera();
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px'
        }}>
            <div style={{
                background: '#ffffff', // Use white background instead of translucent to avoid backdrop-filter glitches
                borderRadius: '32px',
                width: '100%',
                maxWidth: '600px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid #e2e8f0',
                animation: 'modalPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                position: 'relative' // Ensure it's its own stacking context
            }}>
                <div style={{ padding: '25px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#0f172a', fontWeight: '800' }}>Record Video Bio</h3>
                    <button type="button" onClick={onClose} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', color: '#64748b', padding: '8px', borderRadius: '12px' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ position: 'relative', background: '#000', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {loading && <div style={{ color: 'white' }}>Initializing...</div>}
                    {error && <div style={{ color: '#ff4444', padding: '20px', textAlign: 'center' }}>{error}</div>}

                    {!previewUrl ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: error || loading ? 'none' : 'block',
                                transform: 'scaleX(-1)'
                            }}
                        />
                    ) : (
                        <video
                            src={previewUrl}
                            controls
                            autoPlay
                            loop
                            onError={(e) => {
                                console.error("Video preview error:", e);
                                setError("The recorded video could not be played. Please try retaking.");
                            }}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    )}

                    {recording && (
                        <div style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'rgba(255,0,0,0.8)',
                            color: 'white',
                            padding: '5px 12px',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            animation: 'pulse 1s infinite'
                        }}>
                            <Timer size={16} /> {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                        </div>
                    )}
                </div>

                <div style={{ padding: '30px', display: 'flex', gap: '15px', justifyContent: 'center', background: '#f8fafc' }}>
                    {!previewUrl ? (
                        <button
                            type="button"
                            onClick={recording ? stopRecording : startRecording}
                            disabled={!stream || loading}
                            style={{
                                background: recording ? '#ef4444' : 'linear-gradient(135deg, var(--primary), #4f46e5)',
                                color: 'white',
                                border: 'none',
                                padding: '16px 32px',
                                borderRadius: '20px',
                                fontWeight: '800',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                opacity: !stream || loading ? 0.6 : 1,
                                width: '220px',
                                justifyContent: 'center',
                                boxShadow: recording ? '0 10px 15px -3px rgba(239, 68, 68, 0.4)' : '0 10px 15px -3px rgba(79, 70, 229, 0.4)'
                            }}
                        >
                            {recording ? (
                                <><Square size={22} fill="white" /> {t('stop_recording')}</>
                            ) : (
                                <><Video size={22} /> {t('start_recording')}</>
                            )}
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={handleRetake}
                                style={{
                                    background: '#ffffff',
                                    color: '#475569',
                                    border: '1px solid #e2e8f0',
                                    padding: '16px 28px',
                                    borderRadius: '20px',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <RefreshCw size={22} /> {t('retake')}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                style={{
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '16px 28px',
                                    borderRadius: '20px',
                                    fontWeight: '800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.4)'
                                }}
                            >
                                <Check size={22} /> {t('use_video')}
                            </button>
                        </>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes modalPop {
                    from { opacity: 0; transform: scale(0.9) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default VideoRecorder;

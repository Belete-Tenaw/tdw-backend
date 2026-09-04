import React, { useState } from 'react';
import { AlertCircle, Zap } from 'lucide-react';
import axios from 'axios';

const PanicButton = ({ contractId }) => {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const BACKEND_URL = process.env.REACT_APP_API_URL || 'https://edwl-backend.onrender.com';

    const handlePanic = async () => {
        if (!window.confirm("⚠️ EMERGENCY: This will alert TDW administration that you need immediate assistance. Continue?")) {
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Try to get geolocation if possible
            let location = 'Unknown';
            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                location = `${pos.coords.latitude}, ${pos.coords.longitude}`;
            } catch (err) {
                console.warn("Location access denied or timeout");
            }

            await axios.post(`${BACKEND_URL}/api/safety/panic`, {
                location,
                contractId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSent(true);
            alert("🚨 Alert sent! Help is being notified. Please stay safe.");
        } catch (err) {
            console.error("Panic alert failed:", err);
            alert("Failed to send alert. Please contact emergency services directly.");
        } finally {
            setLoading(false);
        }
    };

    if (sent) return (
        <div style={{ padding: '10px', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} /> ALERT SENT TO ADMIN
        </div>
    );

    return (
        <button
            onClick={handlePanic}
            disabled={loading}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '50px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)',
                fontSize: '0.9rem',
                transition: 'transform 0.2s',
                animation: 'pulse 1.5s infinite'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
            <Zap size={18} fill="white" /> {loading ? 'SENDING...' : 'EMERGENCY SOS'}
            <style>{`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            `}</style>
        </button>
    );
};

export default PanicButton;

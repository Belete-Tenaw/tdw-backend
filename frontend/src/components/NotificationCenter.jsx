import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, Info, AlertTriangle, MessageCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';
import { useTranslation } from 'react-i18next';

const NotificationCenter = ({ user }) => {
    const { t } = useTranslation();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchNotifications();

        // Listen for real-time notifications
        if (socket) {
            socket.emit('join', user.id);
            socket.on('new_notification', (notification) => {
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);
            });
        }

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (socket) socket.off('new_notification');
        };
    }, [user.id]);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/auth/notifications');
            setNotifications(res.data);
            setUnreadCount(res.data.filter(n => !n.read).length);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    const markAsRead = async (id) => {
        try {
            await api.put(`/auth/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/auth/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'MATCH': return <CheckCircle size={18} color="var(--primary)" />;
            case 'MESSAGE': return <MessageCircle size={18} color="#3b82f6" />;
            case 'PAYMENT': return <Info size={18} color="#10b981" />;
            default: return <Bell size={18} color="var(--text-light)" />;
        }
    };

    return (
        <div className="notification-center" ref={dropdownRef} style={{ position: 'relative' }}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    cursor: 'pointer', 
                    position: 'relative',
                    padding: '8px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'var(--transition)'
                }}
                className="nav-link"
            >
                <Bell size={22} color={unreadCount > 0 ? 'var(--primary)' : 'var(--text-light)'} />
                {unreadCount > 0 && (
                    <span style={{ 
                        position: 'absolute', 
                        top: '4px', 
                        right: '4px', 
                        background: '#ef4444', 
                        color: 'white', 
                        fontSize: '0.65rem', 
                        padding: '2px 5px', 
                        borderRadius: '10px',
                        fontWeight: '900',
                        border: '2px solid white'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{ 
                    position: 'absolute', 
                    top: '120%', 
                    right: 0, 
                    width: '320px', 
                    maxHeight: '450px', 
                    background: 'var(--white)', 
                    boxShadow: 'var(--shadow-lg)', 
                    borderRadius: '16px', 
                    overflow: 'hidden',
                    zIndex: 2000,
                    border: '1px solid var(--glass-border)',
                    animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--secondary)' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>{t('notifications') || 'Notifications'}</h4>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div style={{ overflowY: 'auto', maxHeight: '350px' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-light)' }}>
                                <Bell size={32} style={{ opacity: 0.2, marginBottom: '10px' }} />
                                <p style={{ fontSize: '0.9rem' }}>No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div 
                                    key={n.id} 
                                    onClick={() => markAsRead(n.id)}
                                    style={{ 
                                        padding: '12px 16px', 
                                        borderBottom: '1px solid #f8fafc', 
                                        background: n.read ? 'transparent' : 'hsla(180, 100%, 25%, 0.03)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        gap: '12px'
                                    }}
                                    className="notification-item"
                                >
                                    <div style={{ marginTop: '3px' }}>{getIcon(n.type)}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: n.read ? '600' : '800', color: 'var(--navy)', marginBottom: '2px' }}>{n.title}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', lineHeight: '1.4' }}>{n.message}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', marginTop: '8px' }}></div>}
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <Link to="/notifications" onClick={() => setIsOpen(false)} style={{ display: 'block', padding: '12px', textAlign: 'center', fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)', textDecoration: 'none', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                            View all notifications
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;

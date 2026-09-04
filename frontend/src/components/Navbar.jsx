import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { useTranslation } from 'react-i18next';
import { Menu, LogOut, User, MessageSquare, LogIn, LayoutDashboard, Briefcase, Sun, Moon, Database, Gift } from 'lucide-react';
import logo from '../assets/logo_premium_v4.png';
import NotificationCenter from './NotificationCenter';

const Navbar = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [isProfileOpen, setIsProfileOpen] = React.useState(false);
    const user = authService.getCurrentUser();
    const [theme, setTheme] = React.useState(localStorage.getItem('theme') || 'light');
    const [lowDataMode, setLowDataMode] = React.useState(localStorage.getItem('lowDataMode') === 'true');

    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
    
    const toggleLowDataMode = () => {
        const newState = !lowDataMode;
        setLowDataMode(newState);
        localStorage.setItem('lowDataMode', newState);
        window.location.reload(); // Reload to apply data mode globally (e.g. stop video auto-load)
    };

    const handleLogout = () => {
        authService.logout();
        setIsMenuOpen(false);
        navigate('/login');
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'am' : 'en';
        i18n.changeLanguage(newLang);
        setIsMenuOpen(false);
    };

    const closeMenu = () => setIsMenuOpen(false);

    const getNavLinkClass = ({ isActive }) => 
        `nav-link ${isActive ? 'nav-link-active' : ''}`;

    return (
        <nav className="navbar glass" style={{ position: 'sticky', top: 0, zIndex: 1000, padding: '10px 24px', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(226, 232, 240, 0.6)', transition: 'all 0.3s ease' }}>
            <NavLink to="/" onClick={closeMenu} className={({ isActive }) => `nav-logo-link ${isActive ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
                <img src={logo} alt="TDW Logo" style={{ height: '55px', width: 'auto', objectFit: 'contain', transition: 'transform 0.3s ease' }} className="nav-logo" />
                <div className="desktop-only" style={{ display: 'flex', flexDirection: 'column', color: 'var(--navy)' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: '900', lineHeight: 1, letterSpacing: '-0.2px' }}>
                        {i18n.language === 'am' ? t('brand_amharic') : t('brand_english')}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)', lineHeight: 1, marginTop: '5px' }}>
                        {i18n.language === 'am' ? t('brand_english') : t('brand_amharic')}
                    </span>
                </div>
            </NavLink>

            {/* Mobile top-right: language toggle + hamburger */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button className="mobile-only" onClick={toggleLanguage} style={{ background: 'transparent', border: '1px solid #ddd', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    {i18n.language === 'en' ? 'አማ' : 'En'}
                </button>
                <button 
                    onClick={toggleLowDataMode} 
                    style={{ 
                        background: lowDataMode ? '#fef3c7' : 'transparent', 
                        border: '1px solid #ddd', 
                        padding: '6px', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        color: lowDataMode ? '#d97706' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.7rem',
                        fontWeight: '800'
                    }}
                    title="Low Data Mode"
                >
                    <Database size={16} /> {lowDataMode ? 'LOW' : 'DATA'}
                </button>
                <div className="mobile-only" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <Menu size={28} color="var(--primary)" style={{ cursor: 'pointer' }} />
                </div>
            </div>

            {/* Desktop nav + mobile slide-in menu */}
            <div className={`navbar-menu ${isMenuOpen ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <NavLink to="/" onClick={closeMenu} className={getNavLinkClass}>{t('home')}</NavLink>
                <NavLink to="/about" onClick={closeMenu} className={getNavLinkClass}>{t('about_us')}</NavLink>
                <NavLink to="/contact" onClick={closeMenu} className={getNavLinkClass}>{t('contact_us')}</NavLink>
                <NavLink to="/pricing" onClick={closeMenu} className={getNavLinkClass}>{t('plans')}</NavLink>
                {user && <NavLink to="/rewards" onClick={closeMenu} className={getNavLinkClass}>{t('rewards') || 'Rewards'}</NavLink>}

                {/* Desktop language toggle */}
                <div className="desktop-only">
                    <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <button 
                            onClick={() => i18n.changeLanguage('en')} 
                            style={{ 
                                padding: '6px 12px', 
                                borderRadius: '7px', 
                                border: 'none', 
                                cursor: 'pointer', 
                                fontSize: '0.8rem', 
                                fontWeight: '700',
                                background: i18n.language === 'en' ? 'var(--primary)' : 'transparent',
                                color: i18n.language === 'en' ? 'white' : 'var(--text-light)',
                                transition: 'var(--transition)'
                            }}
                        >
                            EN
                        </button>
                        <button 
                            onClick={() => i18n.changeLanguage('am')} 
                            style={{ 
                                padding: '6px 12px', 
                                borderRadius: '7px', 
                                border: 'none', 
                                cursor: 'pointer', 
                                fontSize: '0.8rem', 
                                fontWeight: '700',
                                background: i18n.language === 'am' ? 'var(--primary)' : 'transparent',
                                color: i18n.language === 'am' ? 'white' : 'var(--text-light)',
                                transition: 'var(--transition)'
                            }}
                        >
                            አማ
                        </button>
                    </div>
                </div>

                {/* Logged-in specific links (Messages, Dashboard, Notifications) */}
                {user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }} className="nav-links">
                        <NotificationCenter user={user} />
                        <NavLink to="/messages" onClick={closeMenu} className={getNavLinkClass}>
                            <MessageSquare size={20} />
                            <span className="desktop-only">{t('messages')}</span>
                        </NavLink>
                        <NavLink
                            to={user.role === 'JOB_SEEKER' ? '/dashboard/seeker' : user.role === 'EMPLOYER' ? '/dashboard/employer' : '/admin'}
                            onClick={closeMenu}
                            className={getNavLinkClass}
                        >
                            <User size={20} />
                            <span className="desktop-only">{t('dashboard')}</span>
                        </NavLink>
                    </div>
                )}
                
                {/* Low Data Toggle */}
                <button 
                    onClick={toggleLowDataMode}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: lowDataMode ? 'var(--primary)' : 'var(--text-light)' }}
                    title={lowDataMode ? "Disable Low Data Mode" : "Enable Low Data Mode"}
                >
                    <Database size={20} />
                </button>

                {/* Theme Toggle */}
                <button 
                    onClick={toggleTheme}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    className="nav-link"
                >
                    {theme === 'light' ? <Moon size={20} color="var(--text-light)" /> : <Sun size={20} color="var(--primary)" />}
                </button>

                {/* Always visible Auth actions */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }} className="nav-auth">
                    {!user ? (
                        <>
                            {/* Prominent Login button for Guests */}
                            <Link 
                                to="/login" 
                                onClick={closeMenu}
                                className="btn-login"
                                style={{
                                    height: '44px',
                                    padding: '0 28px',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    textDecoration: 'none',
                                    border: '2px solid var(--primary)',
                                    color: 'var(--primary)',
                                    backgroundColor: 'transparent'
                                }}
                            >
                                <LogIn size={20} />
                                {t('login')}
                            </Link>

                            <Link
                                to="/register"
                                onClick={closeMenu}
                                className="btn-primary"
                                style={{
                                    height: '44px',
                                    padding: '0 28px',
                                    fontSize: '0.95rem',
                                    textDecoration: 'none',
                                    textAlign: 'center',
                                    borderRadius: '8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '700',
                                    boxShadow: '0 4px 12px rgba(0, 128, 128, 0.15)'
                                }}
                            >
                                {t('register')}
                            </Link>
                        </>
                    ) : (
                        /* Session Aware: Profile Dropdown */
                        <div style={{ position: 'relative' }}>
                            <div 
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px', 
                                    cursor: 'pointer',
                                    padding: '5px 12px',
                                    borderRadius: '20px',
                                    background: '#f8f9fa',
                                    border: '1px solid #eee'
                                }}
                            >
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                    {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                                </div>
                                <span className="desktop-only" style={{ fontWeight: '600', fontSize: '0.9rem' }}>{user.name || user.username}</span>
                            </div>

                            {isProfileOpen && (
                                <div style={{ 
                                    position: 'absolute', 
                                    top: '120%', 
                                    right: 0, 
                                    background: 'white', 
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
                                    borderRadius: '12px', 
                                    padding: '10px', 
                                    minWidth: '200px',
                                    zIndex: 1100,
                                    border: '1px solid #eee'
                                }}>
                                    <Link to={user.role === 'JOB_SEEKER' ? '/dashboard/seeker' : user.role === 'EMPLOYER' ? '/dashboard/employer' : '/admin'} onClick={() => setIsProfileOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', textDecoration: 'none', color: '#333', fontSize: '0.9rem', borderRadius: '8px' }} className="dropdown-item">
                                        <LayoutDashboard size={18} color="#666" />
                                        <span>{t('dashboard')}</span>
                                    </Link>
                                    <Link to="/messages" onClick={() => setIsProfileOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', textDecoration: 'none', color: '#333', fontSize: '0.9rem', borderRadius: '8px' }} className="dropdown-item">
                                        <MessageSquare size={18} color="#666" />
                                        <span>{t('messages')}</span>
                                    </Link>
                                    <Link to="/pricing" onClick={() => setIsProfileOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', textDecoration: 'none', color: '#333', fontSize: '0.9rem', borderRadius: '8px' }} className="dropdown-item">
                                        <Briefcase size={18} color="#666" />
                                        <span>{t('subscription') || t('plans')}</span>
                                    </Link>
                                    <div style={{ height: '1px', background: '#eee', margin: '8px 0' }}></div>
                                    <button 
                                        onClick={handleLogout}
                                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'none', border: 'none', color: '#cc2200', fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left', borderRadius: '8px' }}
                                        className="dropdown-item logout"
                                    >
                                        <LogOut size={18} />
                                        <span>{t('logout')}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
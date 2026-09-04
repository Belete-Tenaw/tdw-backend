import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Facebook, Twitter, Instagram, Mail, Phone, ShieldCheck, Lock } from 'lucide-react';
import logo from '../assets/logo_modern.png';

const Footer = () => {
    const { t } = useTranslation();

    return (
        <footer style={{ background: 'var(--navy)', color: 'white', padding: '60px 20px 20px', borderTop: '4px solid var(--primary)' }}>
            <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', marginBottom: '40px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={logo} alt="TDW Logo" style={{ height: '50px', width: 'auto' }} />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'white', letterSpacing: '0.5px' }}>
                            {t('brand_english')}
                        </h3>
                    </div>
                    <p style={{ color: '#bdc3c7', lineHeight: '1.6' }}>
                        {t('footer_desc')}
                    </p>
                </div>

                <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>{t('quick_links')}</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        <li style={{ marginBottom: '10px' }}><Link to="/" style={{ color: '#bdc3c7', textDecoration: 'none' }}>{t('home')}</Link></li>
                        <li style={{ marginBottom: '10px' }}><Link to="/about" style={{ color: '#bdc3c7', textDecoration: 'none' }}>{t('about_us')}</Link></li>
                        <li style={{ marginBottom: '10px' }}><Link to="/login" style={{ color: '#bdc3c7', textDecoration: 'none' }}>{t('login')}</Link></li>
                        <li style={{ marginBottom: '10px' }}><Link to="/safety" style={{ color: '#bdc3c7', textDecoration: 'none' }}>{t('safety')}</Link></li>
                        <li style={{ marginBottom: '10px' }}><Link to="/academy" style={{ color: '#bdc3c7', textDecoration: 'none' }}>{t('academy') || 'Training Academy'}</Link></li>
                        <li style={{ marginBottom: '10px' }}><Link to="/pricing" style={{ color: '#bdc3c7', textDecoration: 'none' }}>{t('pricing')}</Link></li>
                    </ul>
                </div>

                <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>{t('legal')}</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        <li style={{ marginBottom: '10px' }}><Link to="/privacy-policy" style={{ color: '#bdc3c7', textDecoration: 'none' }}>{t('privacy_policy')}</Link></li>
                        <li style={{ marginBottom: '10px' }}><Link to="/terms-and-conditions" style={{ color: '#bdc3c7', textDecoration: 'none' }}>{t('terms_and_conditions')}</Link></li>
                    </ul>
                </div>

                <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>{t('contact_us')}</h3>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                        <Mail size={20} color="#bdc3c7" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <a href="mailto:trustworthyaddis@gmail.com" style={{ color: '#bdc3c7', textDecoration: 'none', fontSize: '0.9rem' }}>trustworthyaddis@gmail.com</a>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <Phone size={20} color="#bdc3c7" style={{ flexShrink: 0 }} />
                        <a href="tel:+251943194099" style={{ color: '#bdc3c7', textDecoration: 'none', fontSize: '0.9rem' }}>+251 943 194 099</a>
                    </div>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <Facebook size={24} color="#bdc3c7" style={{ cursor: 'pointer' }} />
                        <Twitter size={24} color="#bdc3c7" style={{ cursor: 'pointer' }} />
                        <Instagram size={24} color="#bdc3c7" style={{ cursor: 'pointer' }} />
                    </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>{t('verified_platform') || 'Verified Platform'}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <ShieldCheck size={32} color="var(--primary)" />
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{t('secure_escrow_footer') || 'Secure Escrow'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#bdc3c7' }}>{t('escrow_desc_footer') || 'Payments are held safely until work is done.'}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Lock size={32} color="#10b981" />
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{t('data_protection_footer') || 'Data Protection'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#bdc3c7' }}>{t('data_desc_footer') || 'Your personal data is encrypted and secure.'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ borderTop: '1px solid #34495e', paddingTop: '20px', textAlign: 'center', color: '#7f8c8d' }}>
                &copy; {new Date().getFullYear()} Trustworthy Domestic Workers. {t('all_rights_reserved')}
            </div>
        </footer>
    );
};

export default Footer;
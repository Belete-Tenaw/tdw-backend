import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import SOSButton from './components/SOSButton';
import { AdminRoute } from './components/AdminRoute';
import { ToastProvider } from './components/Toast';
import authService from './services/authService';

// Helper to handle Chunk Load Errors
const lazyWithRetry = (componentImport) =>
    lazy(async () => {
        const pageHasAlreadyBeenForceReloaded = window.sessionStorage.getItem('page-force-reloaded');
        try {
            const component = await componentImport();
            window.sessionStorage.removeItem('page-force-reloaded');
            return component;
        } catch (error) {
            console.error('Error loading chunk:', error);
            if (!pageHasAlreadyBeenForceReloaded) {
                window.sessionStorage.setItem('page-force-reloaded', 'true');
                return window.location.reload();
            }
            throw error;
        }
    });

// Lazy Load Pages
const Home = lazyWithRetry(() => import('./pages/Home'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const Register = lazyWithRetry(() => import('./pages/Register'));
const Contact = lazyWithRetry(() => import('./pages/Contact'));
const SeekerDashboard = lazyWithRetry(() => import('./pages/dashboards/SeekerDashboard'));
const EmployerDashboard = lazyWithRetry(() => import('./pages/dashboards/EmployerDashboard'));
const AdminDashboard = lazyWithRetry(() => import('./pages/dashboards/AdminDashboard'));
const Messages = lazyWithRetry(() => import('./pages/Messages'));
const EditProfile = lazyWithRetry(() => import('./pages/EditProfile'));
const Pricing = lazyWithRetry(() => import('./pages/Pricing'));
const Activate = lazyWithRetry(() => import('./pages/Activate'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'));
const TermsAndConditions = lazyWithRetry(() => import('./pages/TermsAndConditions'));
const About = lazyWithRetry(() => import('./pages/About'));
const Safety = lazyWithRetry(() => import('./pages/Safety'));
const Academy = lazyWithRetry(() => import('./pages/Academy'));
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));
const ForgotPassword = lazyWithRetry(() => import('./pages/ForgotPassword'));
const PaymentSuccess = lazyWithRetry(() => import('./pages/PaymentSuccess'));

const RewardsDashboard = lazyWithRetry(() => import('./pages/RewardsDashboard'));
const AcademyDashboard = lazyWithRetry(() => import('./pages/AcademyDashboard'));
const SmartInterview = lazyWithRetry(() => import('./pages/SmartInterview'));
const MarketingDashboard = lazyWithRetry(() => import('./pages/admin/MarketingDashboard'));
const GuarantorConsentPage = lazyWithRetry(() => import('./pages/GuarantorConsentPage'));
const TelegramMiniApp = lazyWithRetry(() => import('./pages/TelegramMiniApp'));
const AgencyDashboard = lazyWithRetry(() => import('./pages/dashboards/AgencyDashboard'));

const Loading = () => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f8fafc',
        zIndex: 9999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
    }}>
        <div style={{ position: 'relative', width: '80px', height: '80px' }}>
            <div style={{ 
                position: 'absolute', 
                width: '100%', 
                height: '100%', 
                border: '4px solid rgba(0, 128, 128, 0.1)', 
                borderRadius: '50%',
                borderTopColor: 'var(--primary)',
                animation: 'spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite'
            }}></div>
            <div style={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                fontSize: '0.9rem',
                fontWeight: '900',
                color: 'var(--primary)',
                letterSpacing: '1px'
            }}>TDW</div>
        </div>
        <p style={{ marginTop: '24px', fontWeight: '700', color: '#1e293b', fontSize: '1rem', letterSpacing: '0.05em' }}>
            SMART CONNECTING...
        </p>
        <style>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
    </div>
);

const ProtectedRoute = ({ children, allowedRoles }) => {
    const user = authService.getCurrentUser();
    if (!user) return <Navigate to="/login" />;
    if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
    return children;
};

function AppContent() {
    const location = useLocation();
    const isTMA = location.pathname.startsWith('/tma') || location.pathname.startsWith('/telegram-app');

    return (
        <div className="app">
            <Suspense fallback={<Loading />}>
                {!isTMA && <Navbar />}
                <ErrorBoundary>
                    <main style={isTMA ? { padding: 0, margin: 0, minHeight: '100vh' } : {}}>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/pricing" element={<Pricing />} />
                            <Route path="/activate" element={<Activate />} />
                            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                            <Route path="/about" element={<About />} />
                            <Route path="/safety" element={<Safety />} />
                            <Route path="/academy" element={<Academy />} />
                            <Route path="/contact" element={<Contact />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/payment-success" element={<PaymentSuccess />} />
                            
                            {/* Telegram Mini-App Routes */}
                            <Route path="/tma" element={<TelegramMiniApp />} />
                            <Route path="/telegram-app" element={<TelegramMiniApp />} />

                            <Route path="/rewards" element={
                                <ProtectedRoute allowedRoles={['JOB_SEEKER', 'EMPLOYER']}>
                                    <RewardsDashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="/academy" element={
                                <ProtectedRoute allowedRoles={['JOB_SEEKER']}>
                                    <AcademyDashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="/smart-interview" element={
                                <ProtectedRoute allowedRoles={['JOB_SEEKER']}>
                                    <SmartInterview />
                                </ProtectedRoute>
                            } />
                            <Route path="/guarantor-consent" element={<GuarantorConsentPage />} />

                            <Route path="/messages" element={
                                <ProtectedRoute allowedRoles={['JOB_SEEKER', 'EMPLOYER', 'ADMIN']}>
                                    <Messages />
                                </ProtectedRoute>
                            } />

                            <Route path="/profile/edit" element={
                                <ProtectedRoute allowedRoles={['JOB_SEEKER', 'EMPLOYER']}>
                                    <EditProfile />
                                </ProtectedRoute>
                            } />

                            <Route path="/dashboard/seeker" element={
                                <ProtectedRoute allowedRoles={['JOB_SEEKER']}>
                                    <SeekerDashboard />
                                </ProtectedRoute>
                            } />

                            <Route path="/dashboard/employer" element={
                                <ProtectedRoute allowedRoles={['EMPLOYER']}>
                                    <EmployerDashboard />
                                </ProtectedRoute>
                            } />

                            <Route path="/dashboard/agency" element={
                                <ProtectedRoute allowedRoles={['AGENCY', 'ADMIN']}>
                                    <AgencyDashboard />
                                </ProtectedRoute>
                            } />

                            <Route path="/admin" element={
                                <AdminRoute>
                                    <AdminDashboard />
                                </AdminRoute>
                            } />

                            <Route path="/admin/marketing" element={
                                <AdminRoute>
                                    <MarketingDashboard />
                                </AdminRoute>
                            } />

                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </main>
                </ErrorBoundary>
                {!isTMA && <SOSButton />}
                {!isTMA && <Footer />}
            </Suspense>
        </div>
    );
}

function App() {
    return (
        <ToastProvider>
            <Router>
                <AppContent />
            </Router>
        </ToastProvider>
    );
}


export default App;

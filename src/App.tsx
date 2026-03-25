import { useLocation } from 'react-router-dom';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import LandingPage from './pages/LandingPage';
import ChatbotPage from './pages/ChatbotPage';
import CommunityPage from './pages/CommunityPage';
import ProfilePage from './pages/ProfilePage';
import VideoCallPage from './pages/VideoCallPage';
import AuthForm from './components/auth/AuthForm';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useEffect } from 'react';

const AppContent = () => {
  const { isAuthenticated } = useAuth();

  // Redirect to login if not authenticated and trying to access protected routes
  useEffect(() => {
    const publicPaths = ['/', '/login', '/register'];
    if (!isAuthenticated && !publicPaths.includes(window.location.pathname)) {
      window.location.href = `/login?redirect=${window.location.pathname}`;
    }
  }, [isAuthenticated]);

  const location = useLocation();
const hideNavPaths = ['/video-call'];
const shouldShowNav = !hideNavPaths.some(path => location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-white">
      {shouldShowNav && <Navigation />}
      <Toaster
        position="top-center"
        gutter={12}
        containerStyle={{
          top: '1.5rem',
          left: '1.5rem',
          bottom: '1.5rem',
          right: '1.5rem',
        }}
        toastOptions={{
          duration: 4000,
          className: 'toast',
          success: {
            className: 'toast-success',
            iconTheme: {
              primary: '#fff',
              secondary: '#10B981',
            },
            style: {
              background: '#10B981',
              color: '#fff',
              borderLeft: '4px solid #059669',
            },
          },
          error: {
            className: 'toast-error',
            iconTheme: {
              primary: '#fff',
              secondary: '#EF4444',
            },
            style: {
              background: '#EF4444',
              color: '#fff',
              borderLeft: '4px solid #DC2626',
            },
          },
          loading: {
            className: 'toast-loading',
            style: {
              background: '#3B82F6',
              color: '#fff',
              borderLeft: '4px solid #2563EB',
            },
            iconTheme: {
              primary: '#EFF6FF',
              secondary: '#3B82F6',
            },
          },
          style: {
            padding: '0.75rem 1rem',
            color: '#fff',
            fontSize: '0.9375rem',
            lineHeight: '1.5',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            maxWidth: '28rem',
            width: '100%',
            margin: '0 auto',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            minHeight: '3.5rem',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/chatbot" replace /> : <AuthForm isLogin={true} />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/chatbot" replace /> : <AuthForm isLogin={false} />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/video-call" element={<VideoCallPage />} />
        </Route>
        
        {/* Redirect any other route to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};


function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;

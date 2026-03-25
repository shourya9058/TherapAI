import { MessageCircle, Bot, User, LogIn } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';


export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout, loading } = useAuth();
  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // If still loading, don't render anything
  if (loading) {
  return <LoadingSpinner className="h-16" />;
}

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              YouWho
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/community"
              className={`flex items-center space-x-2 transition-colors font-medium ${
                isActive('/community')
                  ? 'text-emerald-600'
                  : 'text-gray-700 hover:text-emerald-600'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Community</span>
            </Link>
            <Link
              to="/chatbot"
              className={`flex items-center space-x-2 transition-colors font-medium ${
                isActive('/chatbot')
                  ? 'text-emerald-600'
                  : 'text-gray-700 hover:text-emerald-600'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>AI Chatbot</span>
            </Link>
            {isAuthenticated ? (
              <div className="flex items-center space-x-6">
                <Link
                  to="/profile"
                  className={`flex items-center space-x-2 transition-colors font-medium ${
                    isActive('/profile')
                      ? 'text-emerald-600'
                      : 'text-gray-700 hover:text-emerald-600'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-emerald-600 transition-colors font-medium"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-6">
                <Link
                  to="/login"
                  className="flex items-center space-x-2 text-gray-700 hover:text-emerald-600 transition-colors font-medium"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden">
            <button className="text-gray-700 hover:text-emerald-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

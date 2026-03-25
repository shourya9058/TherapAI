import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  
  // Simple debug log
  console.log('Navbar - Auth state:', { isAuthenticated, user });

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  // Always render the navbar, but show different content based on auth state
  const renderAuthButtons = () => {
    if (isAuthenticated) {
      return (
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-700">Welcome, {user?.name || 'User'}</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Sign out
          </button>
        </div>
      );
    }
    
    return (
      <div className="flex space-x-4">
        <Link
          to="/login"
          className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
        >
          Sign in
        </Link>
        <Link
          to="/register"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          Sign up
        </Link>
      </div>
    );
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-gray-900">
              TherapAI
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/"
                className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Home
              </Link>
              {isAuthenticated && (
                <Link
                  to="/dashboard"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {renderAuthButtons()}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

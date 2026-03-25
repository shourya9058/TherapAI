import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';


interface FormData {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  professionalTitle?: string;
  licenseNumber?: string;
  specialization?: string;
  yearsOfExperience?: number;
  bio?: string;
}

const AuthForm: React.FC<{ isLogin?: boolean }> = ({ isLogin = false }) => {
  const [isProfessional, setIsProfessional] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    username: '',
    firstName: '',
    lastName: '',
    professionalTitle: '',
    licenseNumber: '',
    specialization: '',
    yearsOfExperience: 0,
    bio: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect path from query string
  const queryParams = new URLSearchParams(location.search);
  const redirectPath = queryParams.get('redirect') || null;

  // Handle redirection if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath || '/');
    }
  }, [isAuthenticated, navigate, redirectPath]);

  const handleLogin = async (email: string, password: string): Promise<void> => {
    const loadingToast = showLoading('🔐 Authenticating...');
    try {
      await login(email, password);
      // On successful login, the AuthContext will update the user state
      // and the useEffect will handle the navigation
      showSuccess('✅ Welcome back! Redirecting...');
    } catch (error: any) {
      const errorMessage = error?.message?.includes('user-not-found') 
        ? 'No account found with this email. Please sign up first.'
        : error?.message?.includes('wrong-password')
        ? 'Incorrect password. Please try again.'
        : 'Failed to login. Please try again later.';
      
      showError(`❌ ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setTimeout(() => dismissToast(loadingToast), 500);
    }
  };

  // Handle navigation after successful login/register
  useEffect(() => {
    if (isAuthenticated && user) {
      if (redirectPath) {
        navigate(redirectPath);
      } else {
        const defaultPath = user.userType === 'professional' ? '/dashboard' : '/chat';
        navigate(defaultPath);
      }
    }
  }, [isAuthenticated, user, navigate, redirectPath]);

  const handleRegister = async (userData: any, userType: 'anonymous' | 'professional'): Promise<void> => {
    const loadingToast = showLoading('✨ Creating your account...');
    try {
      const result = await register(userData, userType);
      if (result) {
        showSuccess('🎉 Account created successfully! Redirecting...');
        // Navigate based on the redirect path
        const finalRedirect = redirectPath || (userType === 'professional' ? '/dashboard' : '/chat');
        setTimeout(() => navigate(finalRedirect), 1500);
      }
    } catch (error: any) {
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error?.message?.includes('email-already-in-use')) {
        errorMessage = 'This email is already registered. Please log in instead.';
      } else if (error?.message?.includes('weak-password')) {
        errorMessage = 'Password should be at least 6 characters long.';
      } else if (error?.message?.includes('invalid-email')) {
        errorMessage = 'Please enter a valid email address.';
      }
      
      showError(`❌ ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setTimeout(() => dismissToast(loadingToast), 500);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'yearsOfExperience' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await handleLogin(formData.email, formData.password);
      } else {
        const userData = isProfessional 
          ? formData 
          : { 
              email: formData.email, 
              password: formData.password, 
              username: formData.username || `user_${Math.random().toString(36).substr(2, 9)}`
            };
        
        await handleRegister(userData, isProfessional ? 'professional' : 'anonymous');
      }
    } catch (err: any) {
      let errorMessage = 'An error occurred. Please try again.';
      
      if (err.message === 'Network Error') {
        errorMessage = 'Unable to connect to the server. Please check your internet connection and ensure the backend server is running.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      console.error('Authentication error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserType = (isPro: boolean) => {
    setIsProfessional(isPro);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg my-8">
        <div className="p-6 sm:p-8 space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              {isLogin ? 'Welcome Back' : 'Create an Account'}
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              {isLogin 
                ? 'Sign in to continue to TherapAI' 
                : 'Join us today and start your mental health journey'}
            </p>
          </div>

          {!isLogin && (
            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    I am a...
                  </span>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => toggleUserType(false)}
                  className={`py-3 px-4 rounded-lg border-2 transition-all duration-200 ${
                    !isProfessional
                      ? 'border-teal-500 bg-teal-50 text-teal-700 font-medium shadow-md'
                      : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>Anonymous User</span>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => toggleUserType(true)}
                  className={`py-3 px-4 rounded-lg border-2 transition-all duration-200 ${
                    isProfessional
                      ? 'border-teal-500 bg-teal-50 text-teal-700 font-medium shadow-md'
                      : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Professional</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && !isProfessional && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mb-4">
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                      Username (Optional)
                    </label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Choose a username (optional)"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      If left blank, we'll generate a random username for you
                    </p>
                  </div>
                </motion.div>
              )}

              {!isLogin && isProfessional && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 overflow-visible"
                >
                  <div className="flex items-center justify-between">
                    {isLogin && (
                      <div className="flex items-center">
                        <input
                          id="remember-me"
                          name="remember-me"
                          type="checkbox"
                          className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                          Remember me
                        </label>
                      </div>
                    )}

                    {isLogin && (
                      <div className="text-sm">
                        <button
                          type="button"
                          className="font-medium text-teal-600 hover:text-teal-500"
                          onClick={() => {
                            // Handle forgot password
                          }}
                        >
                          Forgot your password?
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName || ''}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName || ''}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="professionalTitle" className="block text-sm font-medium text-gray-700 mb-1">
                      Professional Title *
                    </label>
                    <input
                      type="text"
                      id="professionalTitle"
                      name="professionalTitle"
                      value={formData.professionalTitle || ''}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="e.g., Clinical Psychologist"
                    />
                  </div>

                  <div>
                    <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      License Number *
                    </label>
                    <input
                      type="text"
                      id="licenseNumber"
                      name="licenseNumber"
                      value={formData.licenseNumber || ''}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Your professional license number"
                    />
                  </div>

                  <div>
                    <label htmlFor="specialization" className="block text-sm font-medium text-gray-700 mb-1">
                      Specialization *
                    </label>
                    <input
                      type="text"
                      id="specialization"
                      name="specialization"
                      value={formData.specialization || ''}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="e.g., Anxiety, Depression, PTSD"
                    />
                  </div>

                  <div>
                    <label htmlFor="yearsOfExperience" className="block text-sm font-medium text-gray-700 mb-1">
                      Years of Experience *
                    </label>
                    <input
                      type="number"
                      id="yearsOfExperience"
                      name="yearsOfExperience"
                      min="0"
                      max="50"
                      value={formData.yearsOfExperience || ''}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      rows={3}
                      value={formData.bio || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Tell us about your professional background and approach..."
                    ></textarea>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password *
                </label>
                {isLogin && (
                  <a href="/forgot-password" className="text-sm text-teal-600 hover:text-teal-700">
                    Forgot password?
                  </a>
                )}
              </div>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder={isLogin ? '••••••••' : 'At least 8 characters'}
              />
              {!isLogin && (
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 8 characters long
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-teal-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : isLogin ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <a 
                href={isLogin ? '/register' : '/login'} 
                className="font-medium text-teal-600 hover:text-teal-700"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </a>
            </p>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <span className="sr-only">Sign in with Google</span>
                <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                </svg>
              </button>

              <button
                type="button"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <span className="sr-only">Sign in with Facebook</span>
                <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M20 10c0-5.523-4.477-10-10-10S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            By {isLogin ? 'signing in' : 'registering'}, you agree to our
            <a href="/terms" className="text-teal-600 hover:text-teal-700 font-medium"> Terms of Service </a>
            and
            <a href="/privacy" className="text-teal-600 hover:text-teal-700 font-medium"> Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;

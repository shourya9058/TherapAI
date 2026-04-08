import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';


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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const handleGoogleSuccess = async (tokenResponse: any) => {
    setIsGoogleLoading(true);
    const loadingToast = showLoading('🔐 Signing in with Google...');
    try {
      // Get user info from Google
      const userInfoResponse = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
      );
      const googleUser = userInfoResponse.data;

      // Try to login or register via backend using Google data
      const response = await axios.post(`${API_BASE}/auth/google`, {
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.sub,
        avatar: googleUser.picture,
      });

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        showSuccess('✅ Welcome! Redirecting...');
        setTimeout(() => {
          navigate(redirectPath || '/chatbot');
          window.location.reload();
        }, 800);
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Google sign-in failed. Please try again.';
      showError(`❌ ${msg}`);
      setError(msg);
    } finally {
      setIsGoogleLoading(false);
      setTimeout(() => dismissToast(loadingToast), 500);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      showError('❌ Google sign-in was cancelled or failed.');
    },
  });

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

            <div className="mt-6">
              <button
                type="button"
                onClick={() => googleLogin()}
                disabled={isGoogleLoading}
                className="w-full inline-flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {isGoogleLoading ? (
                  <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" aria-hidden="true" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span>{isGoogleLoading ? 'Connecting...' : 'Continue with Google'}</span>
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

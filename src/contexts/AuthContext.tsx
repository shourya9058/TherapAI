import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';

interface User {
  _id: string;
  email: string;
  username: string;
  userType: 'anonymous' | 'professional';
  isVerified?: boolean;
  avatar?: string;
}

interface RegisterData {
  email: string;
  password: string;
  username: string;
  [key: string]: any;
}

interface AuthResponse {
  token: string;
  user: User;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData, userType: 'anonymous' | 'professional') => Promise<string>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isProfessional: boolean;
  isVerifiedProfessional: boolean;
  clearError: () => void;
  updateAvatar: (avatarName: string) => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/auth` : 
  (import.meta.env.PROD ? '/api/auth' : 'http://localhost:5000/api/auth');

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Utility function to clear all user-specific data from localStorage
const clearUserData = () => {
  const keysToRemove = [
    'lucille_chat_history',
    'userAvatar',
    'userData',
    // Add any other user-specific keys here
  ];

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  // Also clear sessionStorage
  sessionStorage.clear();
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Memoized derived state
  const isAuthenticated = !!token;
  const isProfessional = user?.userType === 'professional';
  const isVerifiedProfessional = user?.userType === 'professional' && user?.isVerified === true;

  // Set auth token for axios and localStorage
  const setAuthToken = useCallback((newToken: string | null) => {
    if (newToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      localStorage.setItem('token', newToken);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, []);

  // Load user data
  const loadUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await axios.get<{ user: User }>(`${API_URL}/me`);
      setUser(response.data.user);
      setError(null);
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error loading user:', axiosError);

      // Clear all data if token is invalid
      clearUserData();
      setToken(null);
      setUser(null);
      setAuthToken(null);
      setError(axiosError.response?.data?.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, [token, setAuthToken]);

  // Initialize auth state
  useEffect(() => {
    if (token) {
      setAuthToken(token);
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token, setAuthToken, loadUser]);

  // Login user
  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Clear previous user's data before logging in
      clearUserData();

      const response = await axios.post<AuthResponse>(`${API_URL}/login`, { email, password });
      const { token: newToken, user: userData } = response.data;

      setToken(newToken);
      setUser(userData);
      setAuthToken(newToken);

    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage = axiosError.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      console.error('Login error:', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Register user
  const register = async (userData: RegisterData, userType: 'anonymous' | 'professional'): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      // Clear previous user's data before registering
      clearUserData();

      const registrationData = { ...userData, userType };
      const response = await axios.post<AuthResponse>(`${API_URL}/register`, registrationData);
      const { token: newToken, user: registeredUser } = response.data;

      setToken(newToken);
      setUser(registeredUser);
      setAuthToken(newToken);

      // Return redirect path based on user type and verification status
      if (userType === 'professional' && !registeredUser.isVerified) {
        return '/verify-email';
      }
      return userType === 'professional' ? '/dashboard' : '/chat';

    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage = axiosError.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      console.error('Registration error:', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      // Clear all user-specific data
      clearUserData();

      // Clear auth state
      setToken(null);
      setUser(null);
      setAuthToken(null);

    } catch (error) {
      console.error('Logout error:', error);
      // Still clear everything even if there's an error
      clearUserData();
      setToken(null);
      setUser(null);
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  };

  // Clear error message
  const clearError = useCallback(() => setError(null), []);

  // Update user avatar
  const updateAvatar = async (avatarName: string): Promise<void> => {
    try {
      const response = await axios.patch(`${API_URL}/avatar`, { avatar: avatarName });
      if (response.data.success) {
        setUser(prev => prev ? { ...prev, avatar: response.data.avatar } : null);
        // Also update local storage for persistence across simple reloads if needed, 
        // though /me will handle it correctly on reload now.
        localStorage.setItem('userAvatar', avatarName);
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage = axiosError.response?.data?.message || 'Failed to update avatar';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated,
    isProfessional,
    isVerifiedProfessional,
    clearError,
    updateAvatar,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
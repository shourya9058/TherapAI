import axios from 'axios';

const API_URL = 'http://localhost:5000/api/connections';

// Configure axios to include credentials (cookies)
axios.defaults.withCredentials = true;

// Add request interceptor to include auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const recordConnection = async (partnerId: string) => {
  try {
    const res = await axios.post(`${API_URL}/record`, { partnerId });
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to record connection');
  }
};

export const checkConnection = async (partnerId: string) => {
  try {
    const res = await axios.get(`${API_URL}/check/${partnerId}`);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to check connection');
  }
};

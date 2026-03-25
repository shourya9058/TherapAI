import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/community` : 
  (import.meta.env.PROD ? '/api/community' : 'http://localhost:5000/api/community');

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

// Add response interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getPosts = async () => {
  try {
    const res = await axios.get(API_URL);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch posts');
  }
};

export const createPost = async (content: string, category: string) => {
  try {
    const res = await axios.post(API_URL, { content, category });
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to create post');
  }
};

export const addComment = async (postId: string, content: string) => {
  try {
    const res = await axios.post(`${API_URL}/${postId}/comment`, { content });
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to add comment');
  }
};

export const addReaction = async (postId: string, reactionType: string) => {
  try {
    const res = await axios.post(`${API_URL}/${postId}/reaction`, { reactionType });
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to add reaction');
  }
};

export const removeReaction = async (postId: string, reactionType: string) => {
  try {
    const res = await axios.delete(`${API_URL}/${postId}/reaction/${reactionType}`);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to remove reaction');
  }
};

export const deletePost = async (postId: string) => {
  try {
    const res = await axios.delete(`${API_URL}/${postId}`);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to delete post');
  }
};

export const deleteComment = async (postId: string, commentId: string) => {
  try {
    const res = await axios.delete(`${API_URL}/${postId}/comment/${commentId}`);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to delete comment');
  }
};

export const markResolved = async (postId: string) => {
  try {
    const res = await axios.patch(`${API_URL}/${postId}/resolve`);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to update status');
  }
};

export const toggleSave = async (postId: string) => {
  try {
    const res = await axios.post(`${API_URL}/${postId}/save`);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to save post');
  }
};

export const incrementView = async (postId: string) => {
  try {
    const res = await axios.patch(`${API_URL}/${postId}/view`);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to update views');
  }
};

export const getSavedPosts = async () => {
  try {
    const res = await axios.get(`${API_URL}/saved`);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch saved posts');
  }
};
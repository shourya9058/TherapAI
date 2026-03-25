// src/services/communityService.ts
import axios, { AxiosError } from 'axios';

const API_URL = 'http://localhost:5000';

// Create axios instance with timeout and headers
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  validateStatus: (status) => status < 500,
});

// Add request interceptor to include auth token
api.interceptors.request.use(
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
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    let errorMessage = 'An unexpected error occurred. Please try again later.';
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out. Please check your connection and try again.';
    } else if (!error.response) {
      errorMessage = 'Unable to connect to the server. Please check your internet connection.';
    } else {
      switch (error.response.status) {
        case 401:
          localStorage.removeItem('token');
          window.location.href = '/login';
          errorMessage = 'Your session has expired. Please log in again.';
          break;
        case 403:
          errorMessage = 'You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'The requested resource was not found.';
          break;
        case 500:
          errorMessage = 'An internal server error occurred. Please try again later.';
          break;
        default:
          const responseData = error.response.data as any;
          if (responseData && responseData.message) {
            errorMessage = responseData.message;
          }
      }
    }
    
    const errorWithMessage = new Error(errorMessage);
    (errorWithMessage as any).isAxiosError = true;
    throw errorWithMessage;
  }
);

// Get all posts
export const getPosts = async () => {
  try {
    const response = await api.get('/api/community');
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    throw error;
  }
};

// Create a new post
export const createPost = async (postData: { content: string; category: string; avatar?: string }) => {
  try {
    // Include the avatar in the request if provided
    const postWithAvatar = {
      ...postData,
      author: {
        ...(postData as any).author, // Preserve existing author data if any
        avatar: postData.avatar || ''
      }
    };
    
    const response = await api.post('/api/community', postWithAvatar);
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return {
      ...response.data,
      author: {
        ...response.data.author,
        avatar: postData.avatar || response.data.author?.avatar || ''
      },
      reactions: response.data.reactions || { like: 0, love: 0, support: 0, celebrate: 0, insightful: 0 },
      comments: response.data.comments || [],
      views: response.data.views || 0
    };
  } catch (error: any) {
    console.error('Error creating post:', error);
    throw error;
  }
};

// Add a comment to a post
export const addComment = async (postId: string, content: string, avatar?: string) => {
  try {
    const commentData = { 
      content,
      ...(avatar && { author: { avatar } })
    };
    
    const response = await api.post(`/api/community/${postId}/comments`, commentData);
    
    // Ensure the comment has the avatar
    if (response.data) {
      return {
        ...response.data,
        author: {
          ...response.data.author,
          avatar: avatar || response.data.author?.avatar || ''
        }
      };
    }
    return response.data;
  } catch (error: any) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

// Mark a post as resolved (toggle)
export const markAsResolved = async (postId: string) => {
  try {
    const response = await api.patch(`/api/community/${postId}/resolve`);
    return response.data;
  } catch (error: any) {
    console.error('Error marking as resolved:', error);
    throw error;
  }
};

// Delete a post
export const deletePost = async (postId: string) => {
  try {
    const response = await api.delete(`/api/community/${postId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error deleting post:', error);
    throw error;
  }
};

// Toggle like on a post (legacy support)
export const toggleLike = async (postId: string) => {
  try {
    const response = await api.post(`/api/community/${postId}/like`);
    return response.data;
  } catch (error: any) {
    console.error('Error toggling like:', error);
    throw error;
  }
};

// Add reaction to a post
export const addReaction = async (postId: string, reactionType: string) => {
  try {
    const response = await api.post(`/api/community/${postId}/reaction`, { reactionType });
    return response.data;
  } catch (error: any) {
    console.error('Error adding reaction:', error);
    throw error;
  }
};

// Remove reaction from a post
export const removeReaction = async (postId: string, reactionType: string) => {
  try {
    const response = await api.delete(`/api/community/${postId}/reaction/${reactionType}`);
    return response.data;
  } catch (error: any) {
    console.error('Error removing reaction:', error);
    throw error;
  }
};

// Increment post views
export const incrementViews = async (postId: string) => {
  try {
    const response = await api.patch(`/api/community/${postId}/view`);
    return response.data;
  } catch (error: any) {
    console.error('Error incrementing views:', error);
    return null;
  }
};
// backend/middleware/auth.middleware.js
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';

// Protect routes
const protect = async (req, res, next) => {
  let token;

  // Get token from header
  if (
    req.headers.authorization && 
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      console.log('🔐 Authenticating request...');
      
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      console.log('✅ Token verified, user ID:', decoded.id);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        console.log('❌ User not found for ID:', decoded.id);
        return res.status(401).json({ 
          success: false, 
          message: 'Not authorized, user not found' 
        });
      }

      console.log('✅ User authenticated:', req.user.username || req.user.email);
      next();
    } catch (error) {
      console.error('❌ Authentication error:', error.message);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Not authorized, invalid token' 
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Not authorized, token expired' 
        });
      }
      
      res.status(401).json({ 
        success: false, 
        message: 'Not authorized, token failed' 
      });
    }
  } else {
    console.log('❌ No token provided');
    res.status(401).json({ 
      success: false, 
      message: 'Not authorized, no token' 
    });
  }
};

// Alias for community routes compatibility
const auth = protect;

// Authorize roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user is professional
const isProfessional = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
  
  if (req.user && req.user.userType === 'professional') {
    return next();
  }
  
  res.status(403).json({
    success: false,
    message: 'Access denied. Professional account required.'
  });
};

// Check if user is verified professional
const isVerifiedProfessional = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
  
  if (req.user && req.user.userType === 'professional' && req.user.isVerified) {
    return next();
  }
  
  res.status(403).json({
    success: false,
    message: 'Access denied. Verified professional account required.'
  });
};

export { 
  protect as auth, 
  protect, // Export as 'auth' for community routes
  authorize, 
  isProfessional, 
  isVerifiedProfessional 
};

export default protect;
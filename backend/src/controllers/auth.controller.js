//auth.controller.js
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User, AnonymousUser, ProfessionalUser } from '../models/user.model.js';
import { sendVerificationEmail } from '../utils/emailService.js';
import crypto from 'crypto';

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      userType: user.userType,
      email: user.email,
      username: user.username || user.displayName || `user_${user._id.toString().slice(-8)}`
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Format user response (remove sensitive data)
const formatUserResponse = (user) => {
  const { password, verificationToken, verificationTokenExpires, resetPasswordToken, resetPasswordExpires, ...userData } = user._doc || user;
  return userData;
};

// @desc    Register a new user (both anonymous and professional)
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userType } = req.body;
    let newUser;

    // Force a random anonymous username for ALL users
    const username = `user_${Math.random().toString(36).substring(2, 10)}`;

    if (userType === 'anonymous') {
      // Create a copy of req.body without sensitive fields
      const { userType: _, username: __, ...userData } = req.body;
      
      newUser = new AnonymousUser({
        ...userData,
        username,
        displayName: `Anonymous${Math.floor(1000 + Math.random() * 9000)}`,
        isVerified: true // No email verification for anonymous users
      });
    } else if (userType === 'professional') {
      // For professionals, we'll require email verification
      const verificationToken = uuidv4();
      
      // Create a copy of req.body without sensitive fields
      const { userType: _, username: __, ...userData } = req.body;
      
      newUser = new ProfessionalUser({
        ...userData,
        username, // Force the random username here too
        verificationToken,
        verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      });

      // Send verification email
      await sendVerificationEmail({
        email: newUser.email,
        name: `${newUser.firstName} ${newUser.lastName}`,
        token: verificationToken
      });
    } else {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid user type' 
      });
    }

    await newUser.save();

    // Generate token
    const token = generateToken(newUser);

    // Format user response
    const userData = formatUserResponse(newUser);

    res.status(201).json({
      success: true,
      token,
      user: userData,
      message: userType === 'professional' 
        ? 'Registration successful! Please check your email to verify your account.'
        : 'Anonymous account created successfully!'
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists (with password field)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check if user is verified (for professional users)
    if (user.userType === 'professional' && !user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate token
    const token = generateToken(user);

    // Format user response (remove password)
    const userData = formatUserResponse(user);

    res.json({
      success: true,
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    const user = await ProfessionalUser.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired verification token' 
      });
    }

    // Update user
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    // Redirect to login page or show success message
    res.redirect(`${process.env.CLIENT_URL}/login?verified=true`);
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Email verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ 
        success: true,
        message: 'If your email is registered, you will receive a password reset link.'
      });
    }

    // Generate reset token
    const resetToken = uuidv4();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset email
    await sendPasswordResetEmail({
      email: user.email,
      name: user.firstName || user.username || 'User',
      token: resetToken
    });

    res.json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing forgot password request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired password reset token' 
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error resetting password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update user avatar
// @route   PATCH /api/auth/avatar
// @access  Private
export const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;

    // List of allowed animal avatars (must match frontend AVATARS)
    const ALLOWED_AVATARS = [
      'CatAvatar.png', 'DogAvatar.png', 'FoxAvatar.png', 'GiraffeAvatar.png',
      'MantesAvatar.png', 'OtterAvatar.png', 'PandaAvatar.png', 'PenguinAvatar.png',
      'RabbitAvatar.png', 'TigerAvatar.png'
    ];

    if (!avatar || !ALLOWED_AVATARS.includes(avatar)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid avatar selection'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.avatar = avatar;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating avatar',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Google OAuth login/register
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req, res) => {
  try {
    const { email, name, googleId, avatar } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({ success: false, message: 'Missing Google user data' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create a new anonymous user for Google sign-in
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const username = `user_${Math.random().toString(36).substring(2, 10)}`;
      const displayName = name || `Anonymous${Math.floor(1000 + Math.random() * 9000)}`;

      user = new AnonymousUser({
        email,
        password: randomPassword,
        username,
        displayName,
        isVerified: true,
        avatar: 'PandaAvatar.png',
        googleId,
      });

      await user.save();
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate token
    const token = generateToken(user);
    const userData = formatUserResponse(user);

    res.json({
      success: true,
      token,
      user: userData,
      message: 'Signed in with Google successfully',
    });
  } catch (error) {
    console.error('Google auth error:', error);
    if (error.code === 11000) {
      // Duplicate key — user exists, let them login
      try {
        const user = await User.findOne({ email: req.body.email });
        if (user) {
          user.lastLogin = Date.now();
          await user.save();
          const token = generateToken(user);
          return res.json({ success: true, token, user: formatUserResponse(user) });
        }
      } catch (e) {
        // fall through
      }
    }
    res.status(500).json({
      success: false,
      message: 'Google authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
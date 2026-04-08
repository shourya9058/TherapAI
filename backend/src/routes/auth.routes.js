import { Router } from 'express';
import { body } from 'express-validator';
import { 
  register, 
  login, 
  getCurrentUser, 
  verifyEmail, 
  forgotPassword, 
  resetPassword,
  updateAvatar,
  googleAuth
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// @route   POST /api/auth/register
// @desc    Register a new user (both anonymous and professional)
// @access  Public
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('userType')
      .isIn(['anonymous', 'professional'])
      .withMessage('Invalid user type'),
    body().custom((value, { req }) => {
      // Additional validation for professional users
      if (req.body.userType === 'professional') {
        if (!req.body.firstName) {
          throw new Error('First name is required for professional accounts');
        }
        if (!req.body.lastName) {
          throw new Error('Last name is required for professional accounts');
        }
        if (!req.body.licenseNumber) {
          throw new Error('License number is required for professional accounts');
        }
      }
      return true;
    })
  ],
  register
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password').exists().withMessage('Password is required')
  ],
  login
);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, getCurrentUser);

// @route   GET /api/auth/verify-email/:token
// @desc    Verify email
// @access  Public
router.get('/verify-email/:token', verifyEmail);

// @route   POST /api/auth/forgot-password
// @desc    Forgot password
// @access  Public
router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Please include a valid email')
  ],
  forgotPassword
);

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.post(
  '/reset-password/:token',
  [
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
  ],
  resetPassword
);

// @route   PATCH /api/auth/avatar
// @desc    Update user avatar
// @access  Private
router.patch('/avatar', protect, updateAvatar);

// @route   POST /api/auth/google
// @desc    Google OAuth login/register
// @access  Public
router.post('/google', googleAuth);

export default router;

// connection.controller.js
import { User } from '../models/user.model.js';

/**
 * @desc    Record a successful connection between two users
 * @route   POST /api/connections/record
 * @access  Private
 */
export const recordConnection = async (req, res) => {
  try {
    const { partnerId } = req.body;
    const userId = req.user.id;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required'
      });
    }

    if (userId === partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot connect with yourself'
      });
    }

    // Update both users' connection history
    // We use $addToSet to avoid duplicates just in case
    await User.findByIdAndUpdate(userId, {
      $addToSet: { previousConnections: partnerId }
    });

    await User.findByIdAndUpdate(partnerId, {
      $addToSet: { previousConnections: userId }
    });

    res.json({
      success: true,
      message: 'Connection recorded successfully'
    });
  } catch (error) {
    console.error('Record connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error recording connection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Check if a user has already connected with another user
 * @route   GET /api/connections/check/:partnerId
 * @access  Private
 */
export const checkConnection = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const hasConnected = user.previousConnections.includes(partnerId);

    res.json({
      success: true,
      hasConnected
    });
  } catch (error) {
    console.error('Check connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking connection'
    });
  }
};

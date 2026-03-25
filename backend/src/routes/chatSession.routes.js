// backend/routes/chatSession.routes.js
import express from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Define ChatSession Schema
const chatSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    default: 'New Chat'
  },
  messages: [{
    id: String,
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    error: {
      type: Boolean,
      default: false
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
chatSessionSchema.index({ userId: 1, updatedAt: -1 });

// Middleware to auto-delete oldest session when limit exceeded
chatSessionSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const sessionCount = await this.constructor.countDocuments({ userId: this.userId });
      
      if (sessionCount >= 5) {
        const oldestSession = await this.constructor.findOne({ userId: this.userId })
          .sort({ updatedAt: 1 })
          .limit(1);
        
        if (oldestSession) {
          await this.constructor.findByIdAndDelete(oldestSession._id);
          console.log('🗑️ Auto-deleted oldest session:', oldestSession._id);
        }
      }
    } catch (error) {
      console.error('❌ Error in pre-save middleware:', error);
    }
  }
  next();
});

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

// Get all sessions for the authenticated user (max 5 most recent)
router.get('/', auth, async (req, res) => {
  try {
    console.log('📥 GET /api/chat-sessions - User:', req.user._id);
    
    const sessions = await ChatSession.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();
    
    console.log(`✅ Found ${sessions.length} sessions`);
    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('❌ Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat sessions',
      error: error.message
    });
  }
});

// Get a specific session
router.get('/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await ChatSession.findOne({
      _id: sessionId,
      userId: req.user._id
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('❌ Error fetching session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session',
      error: error.message
    });
  }
});

// Create a new session
router.post('/', auth, async (req, res) => {
  try {
    console.log('📝 POST /api/chat-sessions - Creating new session');
    
    const { title } = req.body;
    
    const session = new ChatSession({
      userId: req.user._id,
      title: title || 'New Chat',
      messages: []
    });
    
    await session.save();
    
    console.log(`✅ Session created: ${session._id}`);
    res.status(201).json({
      success: true,
      session
    });
  } catch (error) {
    console.error('❌ Error creating session:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create session',
      error: error.message
    });
  }
});

// Update session (add messages or update title)
router.patch('/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title, messages } = req.body;
    
    const session = await ChatSession.findOne({
      _id: sessionId,
      userId: req.user._id
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    if (title !== undefined) {
      session.title = title;
    }
    
    if (messages !== undefined) {
      session.messages = messages;
      
      // Auto-generate title from first user message if still "New Chat"
      if (session.title === 'New Chat' && messages.length > 0) {
        const firstUserMessage = messages.find(msg => msg.role === 'user');
        if (firstUserMessage) {
          session.title = generateSessionTitle(firstUserMessage.content);
          console.log('📝 Auto-generated title:', session.title);
        }
      }
    }
    
    session.updatedAt = new Date();
    await session.save();
    
    console.log(`✅ Session updated: ${sessionId}`);
    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('❌ Error updating session:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update session',
      error: error.message
    });
  }
});

// Add a message to a session
router.post('/:sessionId/messages', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { role, content } = req.body;
    
    if (!role || !content) {
      return res.status(400).json({
        success: false,
        message: 'Role and content are required'
      });
    }
    
    const session = await ChatSession.findOne({
      _id: sessionId,
      userId: req.user._id
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    const newMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    };
    
    session.messages.push(newMessage);
    session.updatedAt = new Date();
    
    // Auto-generate title from first user message if still "New Chat"
    if (session.title === 'New Chat' && role === 'user' && session.messages.length === 1) {
      session.title = generateSessionTitle(content);
    }
    
    await session.save();
    
    res.json({
      success: true,
      session,
      message: newMessage
    });
  } catch (error) {
    console.error('❌ Error adding message:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to add message',
      error: error.message
    });
  }
});

// Delete a session
router.delete('/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Check if this is the last session
    const sessionCount = await ChatSession.countDocuments({ userId: req.user._id });
    
    if (sessionCount <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the last session. You must have at least one session.'
      });
    }
    
    const session = await ChatSession.findOneAndDelete({
      _id: sessionId,
      userId: req.user._id
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    console.log(`✅ Session deleted: ${sessionId}`);
    res.json({
      success: true,
      message: 'Session deleted successfully',
      sessionId
    });
  } catch (error) {
    console.error('❌ Error deleting session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete session',
      error: error.message
    });
  }
});

// Delete all sessions for user (admin/testing purpose)
router.delete('/', auth, async (req, res) => {
  try {
    const result = await ChatSession.deleteMany({ userId: req.user._id });
    
    console.log(`✅ Deleted ${result.deletedCount} sessions for user ${req.user._id}`);
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} sessions`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('❌ Error deleting sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete sessions',
      error: error.message
    });
  }
});

// Helper function to generate intelligent session title
function generateSessionTitle(firstMessage) {
  const cleaned = firstMessage.trim().replace(/\s+/g, ' ');
  
  // Enhanced keyword mapping with multilingual support
  const keywords = {
    stress: ['stress', 'stressed', 'anxiety', 'anxious', 'worried', 'overwhelmed', 'pressure', 'तनाव', 'चिंता', 'दबाव'],
    sad: ['sad', 'depressed', 'down', 'unhappy', 'upset', 'crying', 'miserable', 'उदास', 'दुखी', 'रोना'],
    sleep: ['sleep', 'insomnia', 'tired', 'exhausted', 'fatigue', 'sleepless', 'नींद', 'थकान', 'थका'],
    work: ['work', 'job', 'career', 'office', 'boss', 'colleague', 'workplace', 'काम', 'नौकरी', 'ऑफिस'],
    relationship: ['relationship', 'partner', 'boyfriend', 'girlfriend', 'spouse', 'family', 'marriage', 'रिश्ता', 'परिवार', 'शादी'],
    health: ['health', 'sick', 'pain', 'hurt', 'doctor', 'medical', 'illness', 'स्वास्थ्य', 'बीमार', 'दर्द'],
    lonely: ['lonely', 'alone', 'isolated', 'friend', 'friendless', 'solitude', 'अकेला', 'दोस्त', 'अकेलापन'],
    help: ['help', 'advice', 'support', 'guidance', 'assist', 'मदद', 'सलाह', 'सहायता'],
    anger: ['angry', 'mad', 'furious', 'frustrated', 'irritated', 'annoyed', 'गुस्सा', 'क्रोध', 'नाराज'],
    fear: ['scared', 'afraid', 'fear', 'frightened', 'worried', 'panic', 'डर', 'भय', 'घबराहट'],
    grief: ['loss', 'death', 'grief', 'mourning', 'died', 'passed away', 'शोक', 'मृत्यु', 'गम'],
    confidence: ['confidence', 'self-esteem', 'doubt', 'insecure', 'worthless', 'आत्मविश्वास', 'संदेह'],
    motivation: ['motivation', 'goals', 'purpose', 'meaning', 'direction', 'प्रेरणा', 'लक्ष्य', 'उद्देश्य']
  };
  
  const lowerMessage = cleaned.toLowerCase();
  
  // Check for keywords
  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(word => lowerMessage.includes(word))) {
      const categoryTitles = {
        stress: 'Managing Stress & Anxiety',
        sad: 'Coping with Sadness',
        sleep: 'Sleep & Rest Issues',
        work: 'Work-Life Balance',
        relationship: 'Relationship Support',
        health: 'Health & Wellness',
        lonely: 'Overcoming Loneliness',
        help: 'Seeking Support',
        anger: 'Managing Anger',
        fear: 'Dealing with Fear',
        grief: 'Grief & Loss',
        confidence: 'Building Confidence',
        motivation: 'Finding Motivation'
      };
      return categoryTitles[category];
    }
  }
  
  // If no keywords found, use first 4-6 words
  const words = cleaned.split(' ');
  if (words.length <= 6) {
    return cleaned.length > 35 ? cleaned.substring(0, 35) + '...' : cleaned;
  }
  
  return words.slice(0, 5).join(' ') + '...';
}

export default router;
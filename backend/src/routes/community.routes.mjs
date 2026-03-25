// backend/routes/community.routes.mjs - FIXED VERSION FOR YOUR MODEL
import express from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth.middleware.js';
import Post from '../models/post.model.mjs';

const router = express.Router();

// Get all posts with user's reactions
router.get('/', auth, async (req, res) => {
  try {
    console.log('📥 GET /api/community - Fetching all posts');
    
    const posts = await Post.find({ isDeleted: false })
      .populate('author', 'username')
      .populate('comments.author', 'username')
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`✅ Found ${posts.length} posts`);
    
    // Add user's reaction and saved status to each post
    const postsWithUserData = posts.map(post => {
      // Ensure reactions object exists with all properties
      if (!post.reactions) {
        post.reactions = { like: 0, love: 0, support: 0, celebrate: 0, insightful: 0 };
      }
      
      // Get user's specific reaction
      const userReaction = post.userReactions?.find(
        ur => ur.user.toString() === req.user._id.toString()
      );
      post.userReaction = userReaction ? userReaction.reactionType : null;
      
      // Check if user has saved this post
      post.isSaved = post.savedBy?.some(
        id => id.toString() === req.user._id.toString()
      ) || false;
      
      // Ensure views is a number
      post.views = post.views || 0;
      
      return post;
    });
    
    res.json(postsWithUserData);
  } catch (error) {
    console.error('❌ Error fetching posts:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch posts', 
      error: error.message 
    });
  }
});

// Create a new post
router.post('/', auth, async (req, res) => {
  try {
    console.log('📝 POST /api/community - Creating new post');
    const { content, category } = req.body;
    
    if (!content || !category) {
      return res.status(400).json({ 
        success: false,
        message: 'Content and category are required' 
      });
    }
    
    // Validate category
    const validCategories = ['Mental Health', 'Support', 'Stress', 'Relationships', 'Career', 'Wellness'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }
    
    const post = new Post({
      author: req.user._id,
      content,
      category,
      reactions: { like: 0, love: 0, support: 0, celebrate: 0, insightful: 0 },
      comments: [],
      likes: [],
      userReactions: [],
      resolved: false,
      views: 0,
      savedBy: [],
      viewedBy: [],
      isDeleted: false
    });
    
    await post.save();
    await post.populate('author', 'username');
    
    // Return normalized post
    const postObj = post.toObject();
    postObj.userReaction = null;
    postObj.isSaved = false;
    
    console.log(`✅ Post created: ${post._id}`);
    res.status(201).json(postObj);
  } catch (error) {
    console.error('❌ Error creating post:', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'Failed to create post' 
    });
  }
});

// Add a comment to a post
router.post('/:postId/comment', auth, async (req, res) => {
  try {
    console.log(`💬 POST /api/community/${req.params.postId}/comment`);
    const { content } = req.body;
    const { postId } = req.params;
    
    if (!content?.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'Comment content is required' 
      });
    }
    
    const post = await Post.findOne({ _id: postId, isDeleted: false });
    
    if (!post) {
      return res.status(404).json({ 
        success: false,
        message: 'Post not found' 
      });
    }
    
    post.comments.push({
      author: req.user._id,
      content: content.trim(),
      createdAt: new Date()
    });
    
    await post.save();
    await post.populate('author', 'username');
    await post.populate('comments.author', 'username');
    
    // Return normalized post with user data
    const postObj = post.toObject();
    postObj.userReaction = post.getUserReaction(req.user._id);
    postObj.isSaved = post.isSavedByUser(req.user._id);
    
    console.log(`✅ Comment added to post ${postId}`);
    res.json(postObj);
  } catch (error) {
    console.error('❌ Error adding comment:', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'Failed to add comment' 
    });
  }
});

// Add/Update reaction to a post
router.post('/:postId/reaction', auth, async (req, res) => {
  try {
    console.log(`👍 POST /api/community/${req.params.postId}/reaction`);
    const { postId } = req.params;
    const { reactionType } = req.body;
    
    const validReactions = ['like', 'love', 'support', 'celebrate', 'insightful'];
    
    if (!validReactions.includes(reactionType)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid reaction type' 
      });
    }
    
    const post = await Post.findOne({ _id: postId, isDeleted: false });
    
    if (!post) {
      return res.status(404).json({ 
        success: false,
        message: 'Post not found' 
      });
    }
    
    // Initialize userReactions if not present
    if (!post.userReactions) {
      post.userReactions = [];
    }
    
    // Check if user already reacted
    const existingReactionIndex = post.userReactions.findIndex(
      ur => ur.user.toString() === req.user._id.toString()
    );
    
    if (existingReactionIndex !== -1) {
      // User already reacted - decrement old reaction count
      const oldReactionType = post.userReactions[existingReactionIndex].reactionType;
      post.reactions[oldReactionType] = Math.max(0, (post.reactions[oldReactionType] || 0) - 1);
      
      // Update to new reaction type
      post.userReactions[existingReactionIndex].reactionType = reactionType;
    } else {
      // New reaction from this user
      post.userReactions.push({
        user: req.user._id,
        reactionType
      });
    }
    
    // Increment the new reaction count
    post.reactions[reactionType] = (post.reactions[reactionType] || 0) + 1;
    
    // Mark nested objects as modified for Mongoose
    post.markModified('reactions');
    post.markModified('userReactions');
    
    await post.save();
    await post.populate('author', 'username');
    await post.populate('comments.author', 'username');
    
    // Return normalized post
    const postObj = post.toObject();
    postObj.userReaction = reactionType;
    postObj.isSaved = post.isSavedByUser(req.user._id);
    
    console.log(`✅ Reaction added: ${reactionType} on post ${postId}`);
    res.json(postObj);
  } catch (error) {
    console.error('❌ Error adding reaction:', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'Failed to add reaction' 
    });
  }
});

// Remove reaction from a post
router.delete('/:postId/reaction/:reactionType', auth, async (req, res) => {
  try {
    console.log(`👎 DELETE /api/community/${req.params.postId}/reaction/${req.params.reactionType}`);
    const { postId, reactionType } = req.params;
    
    const validReactions = ['like', 'love', 'support', 'celebrate', 'insightful'];
    
    if (!validReactions.includes(reactionType)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid reaction type' 
      });
    }
    
    const post = await Post.findOne({ _id: postId, isDeleted: false });
    
    if (!post) {
      return res.status(404).json({ 
        success: false,
        message: 'Post not found' 
      });
    }
    
    // Initialize if needed
    if (!post.userReactions) {
      post.userReactions = [];
    }
    
    // Find and remove user's reaction
    const reactionIndex = post.userReactions.findIndex(
      ur => ur.user.toString() === req.user._id.toString()
    );
    
    if (reactionIndex !== -1) {
      const removedReactionType = post.userReactions[reactionIndex].reactionType;
      post.userReactions.splice(reactionIndex, 1);
      
      // Decrement the reaction count
      post.reactions[removedReactionType] = Math.max(0, (post.reactions[removedReactionType] || 0) - 1);
      
      // Mark as modified
      post.markModified('reactions');
      post.markModified('userReactions');
      
      await post.save();
    }
    
    await post.populate('author', 'username');
    await post.populate('comments.author', 'username');
    
    // Return normalized post
    const postObj = post.toObject();
    postObj.userReaction = null;
    postObj.isSaved = post.isSavedByUser(req.user._id);
    
    console.log(`✅ Reaction removed from post ${postId}`);
    res.json(postObj);
  } catch (error) {
    console.error('❌ Error removing reaction:', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'Failed to remove reaction' 
    });
  }
});

// Mark post as resolved/unresolved (toggle - author only)
router.patch('/:postId/resolve', auth, async (req, res) => {
  try {
    console.log(`✔️ PATCH /api/community/${req.params.postId}/resolve`);
    const { postId } = req.params;
    
    const post = await Post.findOne({ _id: postId, isDeleted: false });
    
    if (!post) {
      return res.status(404).json({ 
        success: false,
        message: 'Post not found' 
      });
    }
    
    // Check if user is the post author
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update this post' 
      });
    }
    
    // Toggle resolved status
    post.resolved = !post.resolved;
    await post.save();
    await post.populate('author', 'username');
    await post.populate('comments.author', 'username');
    
    // Return normalized post
    const postObj = post.toObject();
    postObj.userReaction = post.getUserReaction(req.user._id);
    postObj.isSaved = post.isSavedByUser(req.user._id);
    
    console.log(`✅ Post ${postId} marked as ${post.resolved ? 'resolved' : 'unresolved'}`);
    res.json(postObj);
  } catch (error) {
    console.error('❌ Error marking as resolved:', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'Failed to update status' 
    });
  }
});

// Delete a post (author only) - PROPERLY FIXED WITH TRANSACTIONS
router.delete('/:postId', auth, async (req, res) => {
  let session = null;
  
  try {
    console.log(`🗑️ DELETE /api/community/${req.params.postId}`);
    const { postId } = req.params;
    
    // Validate postId format
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid post ID format' 
      });
    }
    
    // Start a session for transaction
    session = await mongoose.startSession();
    session.startTransaction();
    
    // Find the post within the transaction
    const post = await Post.findOne({ _id: postId, isDeleted: false }).session(session);
    
    if (!post) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false,
        message: 'Post not found or already deleted' 
      });
    }
    
    // Check if user is the post author
    if (post.author.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete this post' 
      });
    }
    
    // HARD DELETE: Permanently remove from database
    await Post.findByIdAndDelete(postId).session(session);
    
    // Commit the transaction
    await session.commitTransaction();
    
    console.log(`✅ Post ${postId} permanently deleted from database`);
    res.json({ 
      success: true,
      message: 'Post deleted successfully', 
      postId 
    });
    
  } catch (error) {
    // Abort transaction on error
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Error aborting transaction:', abortError);
      }
    }
    
    console.error('❌ Error deleting post:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete post',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    // Always end the session
    if (session) {
      session.endSession();
    }
  }
});

// Increment post views (track unique views)
router.patch('/:postId/view', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await Post.findOne({ _id: postId, isDeleted: false });
    
    if (!post) {
      return res.status(404).json({ 
        success: false,
        message: 'Post not found' 
      });
    }
    
    // Initialize viewedBy if needed
    if (!post.viewedBy) {
      post.viewedBy = [];
    }
    
    // Only increment if user hasn't viewed before
    if (!post.hasUserViewed(req.user._id)) {
      post.views = (post.views || 0) + 1;
      post.viewedBy.push(req.user._id);
      await post.save();
    }
    
    res.json({ 
      success: true,
      views: post.views 
    });
  } catch (error) {
    console.error('❌ Error incrementing views:', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'Failed to update views' 
    });
  }
});

// Toggle save post (bookmark feature)
router.post('/:postId/save', auth, async (req, res) => {
  try {
    console.log(`📌 POST /api/community/${req.params.postId}/save`);
    const { postId } = req.params;
    
    const post = await Post.findOne({ _id: postId, isDeleted: false });
    
    if (!post) {
      return res.status(404).json({ 
        success: false,
        message: 'Post not found' 
      });
    }
    
    // Initialize savedBy if needed
    if (!post.savedBy) {
      post.savedBy = [];
    }
    
    const savedIndex = post.savedBy.findIndex(
      id => id.toString() === req.user._id.toString()
    );
    
    let isSaved;
    
    if (savedIndex === -1) {
      // Add to saved
      post.savedBy.push(req.user._id);
      isSaved = true;
    } else {
      // Remove from saved
      post.savedBy.splice(savedIndex, 1);
      isSaved = false;
    }
    
    await post.save();
    
    console.log(`✅ Post ${postId} ${isSaved ? 'saved' : 'unsaved'}`);
    res.json({ 
      success: true,
      message: isSaved ? 'Post saved' : 'Post unsaved', 
      isSaved 
    });
  } catch (error) {
    console.error('❌ Error saving post:', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'Failed to save post' 
    });
  }
});

// Get saved posts
router.get('/saved', auth, async (req, res) => {
  try {
    console.log('📌 GET /api/community/saved - Fetching saved posts');
    
    const posts = await Post.find({ 
      savedBy: req.user._id,
      isDeleted: false 
    })
      .populate('author', 'username')
      .populate('comments.author', 'username')
      .sort({ createdAt: -1 })
      .lean();
    
    // Add user data to each post
    const postsWithUserData = posts.map(post => {
      if (!post.reactions) {
        post.reactions = { like: 0, love: 0, support: 0, celebrate: 0, insightful: 0 };
      }
      
      const userReaction = post.userReactions?.find(
        ur => ur.user.toString() === req.user._id.toString()
      );
      post.userReaction = userReaction ? userReaction.reactionType : null;
      post.isSaved = true; // All these posts are saved
      post.views = post.views || 0;
      
      return post;
    });
    
    console.log(`✅ Found ${posts.length} saved posts`);
    res.json(postsWithUserData);
  } catch (error) {
    console.error('❌ Error fetching saved posts:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch saved posts' 
    });
  }
});

// Legacy like endpoint (for backward compatibility)
router.post('/:id/like', auth, async (req, res) => {
  try {
    console.log(`❤️ POST /api/community/${req.params.id}/like`);
    const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
    
    if (!post) {
      return res.status(404).json({ 
        success: false,
        message: 'Post not found' 
      });
    }
    
    const likeIndex = post.likes.indexOf(req.user._id);
    
    if (likeIndex === -1) {
      post.likes.push(req.user._id);
    } else {
      post.likes.splice(likeIndex, 1);
    }
    
    await post.save();
    await post.populate('author', 'username');
    await post.populate('comments.author', 'username');
    
    console.log(`✅ Like toggled on post ${req.params.id}`);
    res.json(post);
  } catch (error) {
    console.error('❌ Error toggling like:', error);
    res.status(400).json({ 
      success: false,
      message: error.message || 'Failed to toggle like' 
    });
  }
});

export default router;
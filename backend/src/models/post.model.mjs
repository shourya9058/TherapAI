// backend/models/post.model.mjs
import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// Schema to track which users reacted with what
const userReactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reactionType: {
    type: String,
    enum: ['like', 'love', 'support', 'celebrate', 'insightful'],
    required: true
  }
}, { _id: false });

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [5000, 'Content cannot be more than 5000 characters']
  },
  category: {
    type: String,
    required: true,
    enum: ['Mental Health', 'Support', 'Stress', 'Relationships', 'Career', 'Wellness']
  },
  // Legacy likes array (for backward compatibility)
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Count of each reaction type
  reactions: {
    like: {
      type: Number,
      default: 0,
      min: 0
    },
    love: {
      type: Number,
      default: 0,
      min: 0
    },
    support: {
      type: Number,
      default: 0,
      min: 0
    },
    celebrate: {
      type: Number,
      default: 0,
      min: 0
    },
    insightful: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  // Track which user reacted with what (for persistence across reloads)
  userReactions: [userReactionSchema],
  // Comments on the post
  comments: [commentSchema],
  // Resolution status
  resolved: {
    type: Boolean,
    default: false
  },
  // View tracking
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  // Track users who viewed the post (for unique views)
  viewedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Saved by users (for bookmark feature)
  savedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Reported posts
  reports: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for faster queries
postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1 });
postSchema.index({ category: 1 });
postSchema.index({ 'userReactions.user': 1 });
postSchema.index({ resolved: 1 });
postSchema.index({ isDeleted: 1 });

// Virtual for total reactions
postSchema.virtual('totalReactions').get(function() {
  if (!this.reactions) return 0;
  return Object.values(this.reactions).reduce((sum, count) => sum + count, 0);
});

// Method to get user's reaction on this post
postSchema.methods.getUserReaction = function(userId) {
  if (!this.userReactions || !userId) return null;
  
  const userReaction = this.userReactions.find(
    ur => ur.user.toString() === userId.toString()
  );
  return userReaction ? userReaction.reactionType : null;
};

// Method to check if user has saved this post
postSchema.methods.isSavedByUser = function(userId) {
  if (!this.savedBy || !userId) return false;
  
  return this.savedBy.some(id => id.toString() === userId.toString());
};

// Method to check if user has viewed this post
postSchema.methods.hasUserViewed = function(userId) {
  if (!this.viewedBy || !userId) return false;
  
  return this.viewedBy.some(id => id.toString() === userId.toString());
};

// Static method to get posts by category
postSchema.statics.getByCategory = function(category) {
  return this.find({ category, isDeleted: false })
    .populate('author', 'username')
    .populate('comments.author', 'username')
    .sort({ createdAt: -1 });
};

// Static method to get trending posts (most reactions in last 24 hours)
postSchema.statics.getTrending = function() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.find({ 
    createdAt: { $gte: yesterday },
    isDeleted: false 
  })
    .populate('author', 'username')
    .populate('comments.author', 'username')
    .sort({ 'reactions.like': -1, 'reactions.love': -1 })
    .limit(10);
};

// Ensure virtuals are included in JSON
postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

const Post = mongoose.model('Post', postSchema);

export default Post;
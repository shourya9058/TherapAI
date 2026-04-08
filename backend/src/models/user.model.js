// user.model.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Base user schema with common fields
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.']
  },
  password: {
    type: String,
    required: false,
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long']
  },
  userType: {
    type: String,
    enum: ['anonymous', 'professional'],
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },

  // ✅ TherapAI Avatar Support (persistent)
  avatar: {
    type: String,
    default: "PandaAvatar.png"   // default avatar
  },

  // ✅ Google OAuth support
  googleId: {
    type: String,
    sparse: true,
    default: null
  },

  status: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active'
  },

  // ✅ Previous Connections (To ensure users don't meet again)
  previousConnections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  discriminatorKey: 'userType'
});

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate a random anonymous username
userSchema.statics.generateAnonymousUsername = function() {
  const randomString = Math.random().toString(36).substring(2, 10);
  return `anon_${randomString}`;
};

// Create the base User model
const User = mongoose.model('User', userSchema);

export default User;

// Anonymous User Schema
const anonymousUserSchema = new mongoose.Schema({
  anonymousId: {
    type: String,
    default: () => `anon_${uuidv4().substring(0, 8)}`
  },
  displayName: {
    type: String,
    default: function() {
      return `Anonymous${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }
});

// Professional User Schema
const professionalUserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  professionalTitle: {
    type: String,
    required: [true, 'Professional title is required'],
    trim: true
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    unique: true
  },
  specialization: {
    type: [String],
    required: [true, 'At least one specialization is required']
  },
  yearsOfExperience: {
    type: Number,
    required: [true, 'Years of experience is required'],
    min: [0, 'Years of experience cannot be negative']
  },
  bio: {
    type: String,
    maxlength: [1000, 'Bio cannot be longer than 1000 characters']
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verificationDocuments: [{
    documentType: String,
    documentUrl: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationBadge: {
    type: Boolean,
    default: false
  },
  availability: {
    type: Map,
    of: [{
      startTime: String,
      endTime: String,
      available: Boolean
    }],
    default: {}
  }
});

// Create discriminator models
const AnonymousUser = User.discriminator('AnonymousUser', anonymousUserSchema);
const ProfessionalUser = User.discriminator('ProfessionalUser', professionalUserSchema);

export { User, AnonymousUser, ProfessionalUser };

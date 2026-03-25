import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { handleVideoCallSocket } from './socket/videoCall.handler.js';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes.js';
import communityRoutes from './routes/community.routes.mjs';
import chatSessionRoutes from './routes/chatSession.routes.js';
import connectionRoutes from './routes/connection.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - CORS MUST BE FIRST
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow same-origin requests (no origin) or trusted local origins
    if (!origin) return callback(null, true);
    
    // Automatically trust .onrender.com and any in allowedOrigins
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Request logging
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Database connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://imparas07singh_db_user:singh007@youwhocluster.banlypu.mongodb.net/therapai';
    
    if (mongoUri.includes('<username>')) {
      console.error('⚠️  Warning: MONGO_URI contains placeholders. Please update your .env file.');
    }
    
    console.log('🔌 Connecting to MongoDB Atlas...');
    
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      family: 4,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      minPoolSize: 1,
      w: 'majority',
      retryWrites: true
    };

    let retries = 3;
    while (retries > 0) {
      try {
        await mongoose.connect(mongoUri, options);
        await mongoose.connection.db.admin().ping();
        console.log('✅ Successfully connected to MongoDB Atlas!');
        console.log(`📦 Database: ${mongoose.connection.name}`);
        
        mongoose.connection.on('connected', () => {
          console.log('✅ MongoDB connected successfully');
        });
        
        mongoose.connection.on('error', (err) => {
          console.error('❌ MongoDB connection error:', err.message);
        });
        
        mongoose.connection.on('disconnected', () => {
          console.log('ℹ️  MongoDB disconnected');
        });
        
        return true;
        
      } catch (error) {
        retries--;
        console.error(`❌ Connection attempt failed. ${retries} retries left...`);
        console.error('Error:', error.message);
        
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('🔍 Connection troubleshooting:');
      console.error('  1. Check your internet connection');
      console.error('  2. Verify IP whitelist in MongoDB Atlas');
      console.error('  3. Check if VPN is required');
      console.error('  4. Verify username and password');
    }
    
    return false;
  }
};


app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'success',
    database: dbStatus,
    mongodb_state: mongoose.connection.readyState,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve static files from the React app
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));

// API Routes
console.log('📡 Registering API routes...');
app.use('/api/auth', authRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/chat-sessions', chatSessionRoutes);
app.use('/api/connections', connectionRoutes);

// Catch-all route for React SPA
app.get('*', (req, res, next) => {
  // If it's an API request that didn't match any route, move to 404 handler
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// 404 handler
app.use((req, res) => {
  console.log(`⚠️  404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Error:', err.stack);
  
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      status: 'error',
      message: 'CORS error - Origin not allowed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  
  res.status(err.status || 500).json({ 
    status: 'error',
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Process handlers
process.on('unhandledRejection', (err) => {
  console.error('🚨 Unhandled Rejection:', err);
  if (server) {
    server.close(() => {
      console.log('💤 Server closed due to unhandled rejection');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  console.error('🚨 Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  if (server) {
    server.close(() => {
      console.log('💤 Server closed');
      mongoose.connection.close(false, () => {
        console.log('💤 MongoDB connection closed');
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received. Shutting down gracefully...');
  if (server) {
    server.close(() => {
      console.log('💤 Server closed');
      mongoose.connection.close(false, () => {
        console.log('💤 MongoDB connection closed');
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }
});

// Start server
let server;
const startServer = async () => {
  try {
    console.log('\n🚀 Starting TherapAI Backend Server...\n');
    
    const isConnected = await connectDB();
    
    if (!isConnected) {
      console.error('\n❌ Failed to connect to MongoDB. Exiting...\n');
      process.exit(1);
    }

    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Initialize Socket.io handlers
    handleVideoCallSocket(io);

    server = httpServer.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🧪 API test: http://localhost:${PORT}/api/test`);
      console.log(`📡 API base URL: http://localhost:${PORT}/api`);
      console.log('='.repeat(60) + '\n');
      console.log('✅ Server is ready to accept requests!\n');
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please:
  1. Stop the other process using this port
  2. Or change the PORT in your .env file`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('\n❌ Failed to start server:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

startServer();

export default app;
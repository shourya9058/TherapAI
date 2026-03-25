// socket/videoCall.handler.js

// In-memory queues for matchmaking
const randomQueue = [];
const expertQueues = {
  'mental-health': [],
  'career': [],
  'relationship': [],
  'motivation': [],
  'education': [],
  'wellness': []
};

export const handleVideoCallSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    socket.on('join-matchmaking', ({ mode, category, user }) => {
      console.log(`👤 User ${user?.username || socket.id} joining ${mode} queue ${category ? `(${category})` : ''}`);
      
      let queue;
      if (mode === 'random') {
        queue = randomQueue;
      } else if (mode === 'expert' && category) {
        queue = expertQueues[category] || [];
      }

      if (!queue) return;

      // Check if user is already in queue
      if (queue.find(u => u.socketId === socket.id)) return;

      // Store user info in socket for cleanup
      socket.userData = { ...user, socketId: socket.id, mode, category };

      // Matchmaking logic (First In First Out)
      if (queue.length > 0) {
        const partner = queue.shift();
        const roomId = `room_${partner.socketId}_${socket.id}`;
        
        console.log(`🤝 Match found! Room: ${roomId}`);

        // Notify both users
        io.to(partner.socketId).emit('match-found', {
          roomId,
          partner: {
            id: user?._id || socket.id,
            username: user?.username || 'Anonymous',
            avatar: user?.avatar || 'CatAvatar.png'
          },
          isOfferer: true
        });

        socket.emit('match-found', {
          roomId,
          partner: {
            id: partner.user?._id || partner.socketId,
            username: partner.user?.username || 'Anonymous',
            avatar: partner.user?.avatar || 'CatAvatar.png'
          },
          isOfferer: false
        });

        // Join both to rooms and track active room ID
        socket.join(roomId);
        socket.activeRoomId = roomId; // 👈 CRITICAL: track this for disconnect cleanup
        const partnerSocket = io.sockets.sockets.get(partner.socketId);
        if (partnerSocket) {
          partnerSocket.join(roomId);
          partnerSocket.activeRoomId = roomId;
        }
        
      } else {
        // Add to queue
        queue.push({
          socketId: socket.id,
          user: user
        });
        socket.emit('waiting', { message: 'Looking for a partner...' });
      }
    });

    // WebRTC Signaling Relay
    socket.on('signal', ({ roomId, signal }) => {
      socket.to(roomId).emit('signal', { signal });
    });

    // Chat Relay
    socket.on('chat-message', ({ roomId, message }) => {
      socket.to(roomId).emit('chat-message', message);
    });

    // Video Frame Relay (socket.io video streaming fallback)
    socket.on('video-frame', ({ roomId, frame }) => {
      socket.to(roomId).emit('remote-video-frame', { frame });
    });

    // Audio Frame Relay (socket.io audio streaming fallback)
    socket.on('audio-frame', ({ roomId, frame }) => {
      socket.to(roomId).emit('remote-audio-frame', { frame });
    });

    // Media status relay (camera/mic on-off)
    socket.on('media-status', ({ roomId, videoOn, audioOn }) => {
      socket.to(roomId).emit('media-status', { videoOn, audioOn });
    });

    // End call
    socket.on('end-call', ({ roomId }) => {
      socket.to(roomId).emit('call-ended');
      socket.leave(roomId);
      socket.activeRoomId = null;
    });

    // Disconnect handling — use 'disconnecting' instead of 'disconnect' 
    // because rooms are still accessible in 'disconnecting'
    socket.on('disconnecting', () => {
      console.log(`🔌 Client disconnecting: ${socket.id}`);
      
      const { mode, category } = socket.userData || {};
      
      // Remove from queues
      if (mode === 'random') {
        const idx = randomQueue.findIndex(u => u.socketId === socket.id);
        if (idx > -1) randomQueue.splice(idx, 1);
      } else if (mode === 'expert' && category) {
        const queue = expertQueues[category];
        if (queue) {
          const idx = queue.findIndex(u => u.socketId === socket.id);
          if (idx > -1) queue.splice(idx, 1);
        }
      }

      // Notify any active room partners using tracked room ID or socket.rooms
      if (socket.activeRoomId) {
        socket.to(socket.activeRoomId).emit('partner-disconnected');
      }

      socket.rooms.forEach(room => {
        if (room.startsWith('room_')) {
          socket.to(room).emit('partner-disconnected');
        }
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client fully disconnected: ${socket.id}`);
    });
  });
};

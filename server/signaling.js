// Socket.IO WebRTC Signaling Server
// Add this to server/index.js or create separate signaling server

import { Server } from 'socket.io';
import http from 'http';

// Create HTTP server for Socket.IO
const createSignalingServer = (app) => {
  const server = http.createServer(app);
  
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  // Store active rooms and participants
  const rooms = new Map();

  io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    // Join interview room
    socket.on('join-room', ({ roomId, userId, role }) => {
      socket.join(roomId);
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }
      
      rooms.get(roomId).add({ socketId: socket.id, userId, role });

      // Notify others in the room
      socket.to(roomId).emit('user-joined', { userId, role });

      console.log(`User ${userId} joined room ${roomId}`);

      // Send existing participants to new user
      const participants = Array.from(rooms.get(roomId));
      socket.emit('room-participants', participants);
    });

    // WebRTC Signaling: Offer
    socket.on('offer', ({ roomId, offer, targetSocketId }) => {
      socket.to(targetSocketId).emit('offer', {
        offer,
        senderSocketId: socket.id,
      });
      console.log(`Offer sent in room ${roomId}`);
    });

    // WebRTC Signaling: Answer
    socket.on('answer', ({ roomId, answer, targetSocketId }) => {
      socket.to(targetSocketId).emit('answer', {
        answer,
        senderSocketId: socket.id,
      });
      console.log(`Answer sent in room ${roomId}`);
    });

    // WebRTC Signaling: ICE Candidate
    socket.on('ice-candidate', ({ roomId, candidate, targetSocketId }) => {
      socket.to(targetSocketId).emit('ice-candidate', {
        candidate,
        senderSocketId: socket.id,
      });
    });

    // Interview control signals
    socket.on('next-question', ({ roomId }) => {
      socket.to(roomId).emit('next-question');
    });

    socket.on('end-interview', ({ roomId }) => {
      socket.to(roomId).emit('interview-ended');
    });

    socket.on('screen-share-start', ({ roomId }) => {
      socket.to(roomId).emit('screen-share-started', { socketId: socket.id });
    });

    socket.on('screen-share-stop', ({ roomId }) => {
      socket.to(roomId).emit('screen-share-stopped', { socketId: socket.id });
    });

    // Leave room
    socket.on('leave-room', ({ roomId, userId }) => {
      socket.leave(roomId);
      
      if (rooms.has(roomId)) {
        const participants = rooms.get(roomId);
        participants.forEach((p) => {
          if (p.socketId === socket.id) {
            participants.delete(p);
          }
        });

        if (participants.size === 0) {
          rooms.delete(roomId);
        }
      }

      socket.to(roomId).emit('user-left', { userId });
      console.log(`User ${userId} left room ${roomId}`);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      // Clean up rooms
      rooms.forEach((participants, roomId) => {
        participants.forEach((p) => {
          if (p.socketId === socket.id) {
            participants.delete(p);
            socket.to(roomId).emit('user-left', { userId: p.userId });
          }
        });

        if (participants.size === 0) {
          rooms.delete(roomId);
        }
      });
    });
  });

  return server;
};

export default createSignalingServer;

// Usage in server/index.js:
/*
import createSignalingServer from './signaling.js';

// ... existing code ...

const server = createSignalingServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.IO signaling server ready`);
});
*/

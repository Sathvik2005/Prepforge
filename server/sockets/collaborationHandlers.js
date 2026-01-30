import CollaborationRoom from '../models/CollaborationRoom.js';

// Socket.IO handlers for real-time collaboration
export function setupCollaborationHandlers(io) {
  // Collaboration namespace
  const collaborationNamespace = io.of('/collaboration');

  collaborationNamespace.on('connection', (socket) => {
    console.log(`✨ Collaboration socket connected: ${socket.id}`);

    // Join a room
    socket.on('join-room', async ({ roomId, userId, userName }) => {
      try {
        const room = await CollaborationRoom.findOne({ roomId });
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Join socket room
        socket.join(roomId);
        socket.roomId = roomId;
        socket.userId = userId;
        socket.userName = userName;

        // Notify others
        socket.to(roomId).emit('user-joined', {
          userId,
          userName,
          timestamp: new Date(),
        });

        // Send current state to new user
        socket.emit('room-state', {
          code: room.codeDocument.content,
          language: room.codeDocument.language,
          version: room.codeDocument.version,
          whiteboard: room.whiteboard.strokes,
          participants: room.getActiveParticipants(),
        });

        console.log(`👤 User ${userName} joined room ${roomId}`);
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Leave room
    socket.on('leave-room', async ({ roomId, userId }) => {
      try {
        socket.leave(roomId);
        
        // Notify others
        socket.to(roomId).emit('user-left', {
          userId,
          timestamp: new Date(),
        });

        console.log(`👋 User ${userId} left room ${roomId}`);
      } catch (error) {
        console.error('Leave room error:', error);
      }
    });

    // Code changes
    socket.on('code-change', async ({ roomId, content, userId, version }) => {
      try {
        const room = await CollaborationRoom.findOne({ roomId });
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Update code in database
        await room.updateCode(content, userId);

        // Broadcast to others in room (except sender)
        socket.to(roomId).emit('code-update', {
          content,
          version: room.codeDocument.version,
          userId,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Code change error:', error);
        socket.emit('error', { message: 'Failed to update code' });
      }
    });

    // Language change
    socket.on('language-change', async ({ roomId, language, userId }) => {
      try {
        const room = await CollaborationRoom.findOne({ roomId });
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        room.codeDocument.language = language;
        await room.save();

        // Broadcast to all in room (including sender)
        collaborationNamespace.to(roomId).emit('language-update', {
          language,
          userId,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Language change error:', error);
      }
    });

    // Cursor position updates
    socket.on('cursor-move', ({ roomId, position, selection, userId, userName, color }) => {
      // Broadcast cursor position to others (lightweight, no DB save)
      socket.to(roomId).emit('cursor-update', {
        userId,
        userName,
        position,
        selection,
        color,
        timestamp: new Date(),
      });
    });

    // Whiteboard drawing
    socket.on('whiteboard-draw', async ({ roomId, stroke, userId }) => {
      try {
        const room = await CollaborationRoom.findOne({ roomId });
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Save stroke to database
        await room.addWhiteboardStroke(stroke, userId);

        // Broadcast to others
        socket.to(roomId).emit('whiteboard-update', {
          stroke: {
            ...stroke,
            userId,
            timestamp: new Date(),
          },
        });
      } catch (error) {
        console.error('Whiteboard draw error:', error);
      }
    });

    // Clear whiteboard
    socket.on('whiteboard-clear', async ({ roomId, userId }) => {
      try {
        const room = await CollaborationRoom.findOne({ roomId });
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        room.whiteboard.strokes = [];
        await room.save();

        // Broadcast to all
        collaborationNamespace.to(roomId).emit('whiteboard-cleared', {
          userId,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Whiteboard clear error:', error);
      }
    });

    // Chat message
    socket.on('chat-message', async ({ roomId, message, userId }) => {
      try {
        const room = await CollaborationRoom.findOne({ roomId });
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Save message
        await room.addChatMessage(userId, message);

        // Broadcast to all (including sender for confirmation)
        collaborationNamespace.to(roomId).emit('chat-update', {
          userId,
          userName: socket.userName,
          message,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Chat message error:', error);
      }
    });

    // Typing indicator
    socket.on('typing-start', ({ roomId, userId, userName }) => {
      socket.to(roomId).emit('user-typing', {
        userId,
        userName,
        isTyping: true,
      });
    });

    socket.on('typing-stop', ({ roomId, userId, userName }) => {
      socket.to(roomId).emit('user-typing', {
        userId,
        userName,
        isTyping: false,
      });
    });

    // Screen sharing
    socket.on('screen-share-start', ({ roomId, userId, userName }) => {
      socket.to(roomId).emit('screen-share-started', {
        userId,
        userName,
        timestamp: new Date(),
      });
    });

    socket.on('screen-share-stop', ({ roomId, userId }) => {
      socket.to(roomId).emit('screen-share-stopped', {
        userId,
        timestamp: new Date(),
      });
    });

    // Recording controls
    socket.on('recording-start', async ({ roomId, userId }) => {
      try {
        const room = await CollaborationRoom.findOne({ roomId });
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        room.recording.isRecording = true;
        room.recording.startedAt = new Date();
        await room.save();

        collaborationNamespace.to(roomId).emit('recording-started', {
          userId,
          timestamp: room.recording.startedAt,
        });
      } catch (error) {
        console.error('Recording start error:', error);
      }
    });

    socket.on('recording-stop', async ({ roomId, userId }) => {
      try {
        const room = await CollaborationRoom.findOne({ roomId });
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        room.recording.isRecording = false;
        room.recording.stoppedAt = new Date();
        room.recording.duration = Math.floor(
          (room.recording.stoppedAt - room.recording.startedAt) / 1000
        );
        await room.save();

        collaborationNamespace.to(roomId).emit('recording-stopped', {
          userId,
          duration: room.recording.duration,
          timestamp: room.recording.stoppedAt,
        });
      } catch (error) {
        console.error('Recording stop error:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 Collaboration socket disconnected: ${socket.id}`);
      
      if (socket.roomId && socket.userId) {
        // Notify others
        socket.to(socket.roomId).emit('user-left', {
          userId: socket.userId,
          userName: socket.userName,
          timestamp: new Date(),
        });
      }
    });
  });

  console.log('✅ Collaboration handlers initialized');
}

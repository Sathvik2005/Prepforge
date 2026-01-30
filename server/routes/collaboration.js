import express from 'express';
import CollaborationRoom from '../models/CollaborationRoom.js';
import Interview from '../models/Interview.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Create a collaboration room for an interview
router.post('/rooms', authMiddleware, async (req, res) => {
  try {
    const { interviewId, settings } = req.body;
    const userId = req.user.id;

    // Verify interview exists
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Check if user is part of the interview
    if (interview.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized for this interview' });
    }

    // Check if room already exists
    let room = await CollaborationRoom.findOne({ interviewId });
    if (room) {
      return res.json({ room });
    }

    // Create new room
    room = new CollaborationRoom({
      roomId: uuidv4(),
      interviewId,
      participants: [{
        userId,
        role: 'candidate',
        joinedAt: new Date(),
        isActive: true,
      }],
      settings: settings || {},
      status: 'waiting',
    });

    await room.save();

    res.status(201).json({ room });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create collaboration room' });
  }
});

// Get room by ID or roomId
router.get('/rooms/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Try to find by roomId or MongoDB _id
    const room = await CollaborationRoom.findOne({
      $or: [
        { roomId },
        { _id: roomId },
      ],
    }).populate('participants.userId', 'name email');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is participant
    const isParticipant = room.participants.some(p => 
      p.userId._id.toString() === userId
    );

    if (!isParticipant) {
      return res.status(403).json({ error: 'Not authorized to access this room' });
    }

    res.json({ room });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Failed to get room' });
  }
});

// Join a collaboration room
router.post('/rooms/:roomId/join', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { role } = req.body;
    const userId = req.user.id;

    const room = await CollaborationRoom.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if room is full
    const activeParticipants = room.getActiveParticipants();
    if (activeParticipants.length >= room.settings.maxParticipants) {
      return res.status(400).json({ error: 'Room is full' });
    }

    // Check if already participant
    const existingParticipant = room.participants.find(p => 
      p.userId.toString() === userId && p.isActive
    );

    if (existingParticipant) {
      return res.json({ room, message: 'Already in room' });
    }

    // Add participant
    await room.addParticipant(userId, role || 'interviewer');
    
    // Add system message
    await room.addChatMessage(userId, `User joined as ${role || 'interviewer'}`, true);

    // Update status to active
    if (room.status === 'waiting') {
      room.status = 'active';
      await room.save();
    }

    res.json({ room });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Leave a collaboration room
router.post('/rooms/:roomId/leave', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await CollaborationRoom.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    await room.removeParticipant(userId);
    await room.addChatMessage(userId, 'User left the room', true);

    // Check if all participants have left
    const activeParticipants = room.getActiveParticipants();
    if (activeParticipants.length === 0) {
      room.status = 'completed';
      await room.save();
    }

    res.json({ message: 'Left room successfully' });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ error: 'Failed to leave room' });
  }
});

// Update code in room
router.post('/rooms/:roomId/code', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, language } = req.body;
    const userId = req.user.id;

    const room = await CollaborationRoom.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (language) {
      room.codeDocument.language = language;
    }

    await room.updateCode(content, userId);

    res.json({ 
      version: room.codeDocument.version,
      lastModifiedAt: room.codeDocument.lastModifiedAt,
    });
  } catch (error) {
    console.error('Update code error:', error);
    res.status(500).json({ error: 'Failed to update code' });
  }
});

// Add whiteboard stroke
router.post('/rooms/:roomId/whiteboard', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { stroke } = req.body;
    const userId = req.user.id;

    const room = await CollaborationRoom.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    await room.addWhiteboardStroke(stroke, userId);

    res.json({ message: 'Stroke added' });
  } catch (error) {
    console.error('Add stroke error:', error);
    res.status(500).json({ error: 'Failed to add stroke' });
  }
});

// Clear whiteboard
router.delete('/rooms/:roomId/whiteboard', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await CollaborationRoom.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    room.whiteboard.strokes = [];
    await room.save();

    res.json({ message: 'Whiteboard cleared' });
  } catch (error) {
    console.error('Clear whiteboard error:', error);
    res.status(500).json({ error: 'Failed to clear whiteboard' });
  }
});

// Add chat message
router.post('/rooms/:roomId/chat', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    const room = await CollaborationRoom.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    await room.addChatMessage(userId, message);

    res.json({ message: 'Message sent' });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get room history (for completed rooms)
router.get('/rooms/:roomId/history', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await CollaborationRoom.findOne({ roomId })
      .populate('participants.userId', 'name email')
      .populate('interviewId');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user was participant
    const wasParticipant = room.participants.some(p => 
      p.userId._id.toString() === userId
    );

    if (!wasParticipant) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Return full room history
    res.json({
      room: {
        roomId: room.roomId,
        status: room.status,
        participants: room.participants,
        codeDocument: room.codeDocument,
        whiteboard: room.whiteboard,
        chat: room.chat,
        recording: room.recording,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get room history' });
  }
});

export default router;

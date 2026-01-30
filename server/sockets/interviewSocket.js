/**
 * REAL-TIME INTERVIEW WEBSOCKET HANDLERS
 * 
 * Handles Socket.IO events for live interviews:
 * - Session start/end
 * - Answer submission
 * - Real-time evaluation feedback
 * - Adaptive question flow
 */

import ImprovedInterviewOrchestrator from '../services/improvedInterviewOrchestrator.js';

export default function setupInterviewSocket(io) {
  const interviewNamespace = io.of('/interview');
  
  interviewNamespace.on('connection', (socket) => {
    console.log(`Interview client connected: ${socket.id}`);
    
    /**
     * Start new interview session
     */
    socket.on('start_interview', async (data, callback) => {
      try {
        const { userId, resumeId, jobDescriptionId, interviewType } = data;
        
        // Validate required fields
        if (!userId || !resumeId) {
          return callback({
            success: false,
            error: 'Missing required fields: userId and resumeId'
          });
        }
        
        // Start session
        const result = await ImprovedInterviewOrchestrator.startSession({
          userId,
          resumeId,
          jobDescriptionId,
          interviewType: interviewType || 'technical',
          socketId: socket.id
        });
        
        // Join room for this session
        socket.join(`session_${result.sessionId}`);
        
        // Store session ID in socket
        socket.sessionId = result.sessionId;
        
        console.log(`Interview started: Session ${result.sessionId} for user ${userId}`);
        
        callback({
          success: true,
          data: {
            sessionId: result.sessionId,
            firstQuestion: result.question,
            context: result.context,
            metadata: result.metadata
          }
        });
        
        // Emit event to room
        interviewNamespace.to(`session_${result.sessionId}`).emit('interview_started', {
          sessionId: result.sessionId,
          targetRole: result.context.targetRole
        });
        
      } catch (error) {
        console.error('Start interview error:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });
    
    /**
     * Submit answer to current question
     */
    socket.on('submit_answer', async (data, callback) => {
      try {
        const { sessionId, answer, timeSpent, mediaId, mediaDuration, mediaSize } = data;
        
        if (!sessionId || !answer) {
          return callback({
            success: false,
            error: 'Missing required fields: sessionId and answer'
          });
        }
        
        // Process answer
        const result = await ImprovedInterviewOrchestrator.processAnswer({
          sessionId,
          answer,
          timeSpent: timeSpent || 0,
          mediaId: mediaId || null,
          mediaDuration: mediaDuration || 0,
          mediaSize: mediaSize || 0
        });
        
        console.log(`Answer processed for session ${sessionId}: ${result.type}`);
        
        // Send response based on result type
        if (result.type === 'interview_complete') {
          callback({
            success: true,
            data: {
              type: 'complete',
              evaluation: result.evaluation,
              summary: result.summary
            }
          });
          
          // Emit completion event
          interviewNamespace.to(`session_${sessionId}`).emit('interview_completed', {
            sessionId,
            summary: result.summary
          });
          
        } else if (result.type === 'follow_up') {
          callback({
            success: true,
            data: {
              type: 'follow_up',
              evaluation: result.evaluation,
              nextQuestion: result.nextQuestion,
              context: result.context
            }
          });
          
          // Emit follow-up event
          interviewNamespace.to(`session_${sessionId}`).emit('follow_up_question', {
            sessionId,
            question: result.nextQuestion,
            reason: 'Additional clarification needed'
          });
          
        } else {
          // Next question
          callback({
            success: true,
            data: {
              type: 'next_question',
              evaluation: result.evaluation,
              nextQuestion: result.nextQuestion,
              context: result.context
            }
          });
          
          // Emit next question event
          interviewNamespace.to(`session_${sessionId}`).emit('next_question', {
            sessionId,
            question: result.nextQuestion,
            progress: {
              turnNumber: result.context.turnNumber,
              topicsCovered: result.context.topicsCovered
            }
          });
        }
        
      } catch (error) {
        console.error('Submit answer error:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });
    
    /**
     * Get current session status
     */
    socket.on('get_session', async (data, callback) => {
      try {
        const { sessionId } = data;
        
        if (!sessionId) {
          return callback({
            success: false,
            error: 'sessionId is required'
          });
        }
        
        const session = await ImprovedInterviewOrchestrator.getSession(sessionId);
        
        callback({
          success: true,
          data: session
        });
        
      } catch (error) {
        console.error('Get session error:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });
    
    /**
     * End interview early
     */
    socket.on('end_interview', async (data, callback) => {
      try {
        const { sessionId } = data;
        
        if (!sessionId) {
          return callback({
            success: false,
            error: 'sessionId is required'
          });
        }
        
        const result = await ImprovedInterviewOrchestrator.endSession(sessionId);
        
        console.log(`Interview ended early: Session ${sessionId}`);
        
        callback({
          success: true,
          data: result
        });
        
        // Emit termination event
        interviewNamespace.to(`session_${sessionId}`).emit('interview_ended', {
          sessionId,
          status: 'terminated',
          summary: result.summary
        });
        
        // Leave room
        socket.leave(`session_${sessionId}`);
        
      } catch (error) {
        console.error('End interview error:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });
    
    /**
     * Request interview analytics
     */
    socket.on('get_analytics', async (data, callback) => {
      try {
        const { userId, filters } = data;
        
        if (!userId) {
          return callback({
            success: false,
            error: 'userId is required'
          });
        }
        
        const analytics = await ImprovedInterviewOrchestrator.getAnalytics(userId, filters || {});
        
        callback({
          success: true,
          data: analytics
        });
        
      } catch (error) {
        console.error('Get analytics error:', error);
        callback({
          success: false,
          error: error.message
        });
      }
    });
    
    /**
     * Client typing indicator (optional feature)
     */
    socket.on('typing', (data) => {
      const { sessionId } = data;
      if (sessionId) {
        socket.to(`session_${sessionId}`).emit('candidate_typing', {
          sessionId
        });
      }
    });
    
    /**
     * Handle disconnection
     */
    socket.on('disconnect', () => {
      console.log(`Interview client disconnected: ${socket.id}`);
      
      // Leave all session rooms
      if (socket.sessionId) {
        socket.leave(`session_${socket.sessionId}`);
      }
    });
    
    /**
     * Error handling
     */
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      socket.emit('interview_error', {
        error: error.message || 'An error occurred'
      });
    });
  });
  
  return interviewNamespace;
}

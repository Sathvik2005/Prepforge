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
import ConversationalInterview from '../models/ConversationalInterview.js';
import InterviewReport from '../models/InterviewReport.js';
import User from '../models/User.js';
import ReportService from '../services/reportService.js';

/**
 * Persist completed session to user interview history.
 * Idempotent – skips if the sessionId already exists in history.
 */
async function persistInterviewHistory(sessionId, userId, summary) {
  try {
    const session = await ConversationalInterview.findById(sessionId).lean();
    if (!session) return;

    // Generate (or retrieve existing) report
    let report;
    try {
      report = await ReportService.generateReport(sessionId, userId);
    } catch (err) {
      console.warn('[interviewSocket] Could not generate report:', err.message);
    }

    // Avoid duplicate history entries
    const user = await User.findById(userId);
    if (!user) return;

    const already = (user.interviewHistory || []).some(
      (h) => h.interviewId?.toString() === sessionId.toString()
    );

    if (!already) {
      user.interviewHistory = user.interviewHistory || [];
      user.interviewHistory.push({
        interviewId: session._id,
        reportId: report?._id || null,
        type: session.interviewType || 'technical',
        role: session.targetRole || 'Software Engineer',
        date: new Date(),
        overallScore: summary?.overallScore || session.finalEvaluation?.scores?.overall || 0,
        readinessLabel: report?.readinessLabel || summary?.readinessLevel || 'Needs Work',
        durationSeconds: session.turns?.reduce((acc, t) => acc + (t.answer?.timeSpent || 0), 0) || 0,
      });
      await user.save();
      console.log(`[interviewSocket] Saved interview history for user ${userId}`);
    }
  } catch (err) {
    console.error('[interviewSocket] persistInterviewHistory error:', err.message);
  }
}

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
        
        // Store session ID and userId in socket for later use
        socket.sessionId = result.sessionId;
        socket.userId = userId;
        
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

          // Persist to user interview history (non-blocking)
          if (data.userId || socket.userId) {
            persistInterviewHistory(sessionId, data.userId || socket.userId, result.summary);
          }
          
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

        // Persist to user interview history (non-blocking)
        if (data.userId || socket.userId) {
          persistInterviewHistory(sessionId, data.userId || socket.userId, result.summary);
        }

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
     * Join existing session room (for clients loading a previously-created session)
     * Allows the socket to receive room-based broadcasts: next_question, interview_completed, etc.
     */
    socket.on('join_session', ({ sessionId, userId }, callback) => {
      if (!sessionId) {
        if (typeof callback === 'function') callback({ success: false, error: 'sessionId is required' });
        return;
      }
      socket.join(`session_${sessionId}`);
      socket.sessionId = sessionId;
      if (userId) socket.userId = userId;
      console.log(`Socket ${socket.id} joined room session_${sessionId}`);
      if (typeof callback === 'function') callback({ success: true });
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

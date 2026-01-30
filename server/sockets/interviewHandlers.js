import InterviewOrchestrator from '../services/interviewOrchestrator.js';
import ConversationalInterview from '../models/ConversationalInterview.js';
import InterviewProgress from '../models/InterviewProgress.js';
import SkillGap from '../models/SkillGap.js';

/**
 * Real-Time Interview WebSocket Handlers
 * Enables live interview sessions with instant feedback
 */

export const setupInterviewHandlers = (io) => {
  const interviewNamespace = io.of('/interview');
  
  interviewNamespace.on('connection', (socket) => {
    console.log('✅ Interview client connected:', socket.id);
    
    let currentSessionId = null;
    let currentUserId = null;
    
    /**
     * START INTERVIEW
     * Client initiates a new interview session
     */
    socket.on('interview:start', async (data, callback) => {
      try {
        const { userId, resumeId, jobDescriptionId, interviewType } = data;
        
        console.log('[INTERVIEW] Starting session:', { userId, resumeId, type: interviewType });
        
        const sessionData = await InterviewOrchestrator.startSession({
          userId,
          resumeId,
          jobDescriptionId,
          interviewType: interviewType || 'technical',
        });
        
        currentSessionId = sessionData.sessionId;
        currentUserId = userId;
        
        // Join room for this session
        socket.join(`session:${currentSessionId}`);
        
        // Emit session started event
        socket.emit('interview:session_started', {
          sessionId: currentSessionId,
          context: sessionData.context,
          state: sessionData.state,
        });
        
        // Emit first question
        socket.emit('interview:question', {
          turnNumber: 1,
          question: sessionData.question,
          questionId: sessionData.questionId,
          timestamp: new Date(),
        });
        
        callback({ success: true, sessionId: currentSessionId });
      } catch (error) {
        console.error('[INTERVIEW] Error starting session:', error);
        callback({ success: false, error: error.message });
      }
    });
    
    /**
     * SUBMIT ANSWER
     * Client submits answer in real-time
     */
    socket.on('interview:submit_answer', async (data, callback) => {
      try {
        const { sessionId, answer, timeSpent } = data;
        
        if (!sessionId || !answer) {
          return callback({ success: false, error: 'Missing required fields' });
        }
        
        console.log('[INTERVIEW] Processing answer for session:', sessionId);
        
        // Emit "evaluating" status
        socket.emit('interview:evaluating', {
          status: 'processing',
          message: 'Analyzing your answer...',
        });
        
        // Process answer
        const result = await InterviewOrchestrator.processAnswer(
          sessionId,
          answer,
          timeSpent || 0
        );
        
        // Emit evaluation results
        socket.emit('interview:evaluation', {
          turnNumber: result.sessionState?.currentTurn - 1,
          score: result.evaluation.score,
          metrics: result.evaluation.metrics,
          feedback: result.evaluation.feedback,
          timestamp: new Date(),
        });
        
        // If interview continues, emit next question
        if (result.shouldContinue) {
          setTimeout(() => {
            socket.emit('interview:question', {
              turnNumber: result.sessionState.currentTurn,
              question: result.nextQuestion.question,
              questionId: result.nextQuestion.questionId,
              timestamp: new Date(),
            });
            
            // Emit updated state
            socket.emit('interview:state_update', {
              state: result.sessionState,
            });
          }, 1000); // 1 second delay for better UX
        } else {
          // Interview complete
          socket.emit('interview:completed', {
            finalEvaluation: result.finalEvaluation || result,
            totalTurns: result.totalTurns,
            duration: result.duration,
            timestamp: new Date(),
          });
        }
        
        callback({ success: true });
      } catch (error) {
        console.error('[INTERVIEW] Error processing answer:', error);
        socket.emit('interview:error', {
          error: error.message,
          timestamp: new Date(),
        });
        callback({ success: false, error: error.message });
      }
    });
    
    /**
     * GET SESSION STATUS
     * Client requests current session state
     */
    socket.on('interview:get_status', async (data, callback) => {
      try {
        const { sessionId } = data;
        
        const session = await ConversationalInterview.findById(sessionId);
        
        if (!session) {
          return callback({ success: false, error: 'Session not found' });
        }
        
        callback({
          success: true,
          status: session.status,
          state: session.state,
          currentTurn: session.state.currentTurn,
        });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
    
    /**
     * TYPING INDICATOR
     * Client is typing an answer
     */
    socket.on('interview:typing', (data) => {
      const { sessionId, isTyping } = data;
      
      if (sessionId) {
        socket.to(`session:${sessionId}`).emit('interview:user_typing', {
          isTyping,
          timestamp: new Date(),
        });
      }
    });
    
    /**
     * REQUEST HINT
     * Client requests a hint for current question
     */
    socket.on('interview:request_hint', async (data, callback) => {
      try {
        const { sessionId } = data;
        
        const session = await ConversationalInterview.findById(sessionId);
        
        if (!session) {
          return callback({ success: false, error: 'Session not found' });
        }
        
        const currentTurn = session.turns[session.turns.length - 1];
        
        if (!currentTurn) {
          return callback({ success: false, error: 'No active question' });
        }
        
        // Generate hint based on expected components
        const hint = generateHint(currentTurn);
        
        socket.emit('interview:hint', {
          hint,
          timestamp: new Date(),
        });
        
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
    
    /**
     * GET PROGRESS
     * Client requests progress update
     */
    socket.on('interview:get_progress', async (data, callback) => {
      try {
        const { userId, targetRole } = data;
        
        const progress = await InterviewProgress.findOne({ userId, targetRole });
        
        if (!progress) {
          return callback({
            success: true,
            hasProgress: false,
          });
        }
        
        const readiness = progress.calculateReadiness();
        
        callback({
          success: true,
          hasProgress: true,
          currentReadiness: readiness,
          stats: progress.practiceStats,
          improvement: progress.improvement,
          topicMastery: progress.topicMastery.slice(0, 10),
        });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
    
    /**
     * GET GAPS
     * Client requests current skill gaps
     */
    socket.on('interview:get_gaps', async (data, callback) => {
      try {
        const { userId, status } = data;
        
        const query = { userId };
        if (status) query.status = status;
        
        const gaps = await SkillGap.find(query)
          .sort({ 'recommendation.priority': -1 })
          .limit(10);
        
        callback({
          success: true,
          gaps: gaps.map(g => ({
            id: g._id,
            skill: g.skill,
            type: g.gapType,
            severity: g.severity,
            priority: g.calculatePriority(),
            status: g.status,
          })),
        });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
    
    /**
     * PAUSE INTERVIEW
     * Client pauses the interview
     */
    socket.on('interview:pause', async (data, callback) => {
      try {
        const { sessionId } = data;
        
        const session = await ConversationalInterview.findById(sessionId);
        
        if (session) {
          session.status = 'paused';
          await session.save();
          
          socket.emit('interview:paused', {
            sessionId,
            timestamp: new Date(),
          });
        }
        
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
    
    /**
     * RESUME INTERVIEW
     * Client resumes paused interview
     */
    socket.on('interview:resume', async (data, callback) => {
      try {
        const { sessionId } = data;
        
        const session = await ConversationalInterview.findById(sessionId);
        
        if (session) {
          session.status = 'in-progress';
          await session.save();
          
          // Re-join session room
          socket.join(`session:${sessionId}`);
          
          // Send current question
          const currentTurn = session.turns[session.turns.length - 1];
          
          if (currentTurn && !currentTurn.answer) {
            socket.emit('interview:question', {
              turnNumber: session.state.currentTurn,
              question: currentTurn.question,
              questionId: currentTurn.questionId,
              timestamp: new Date(),
            });
          }
          
          socket.emit('interview:resumed', {
            sessionId,
            state: session.state,
            timestamp: new Date(),
          });
        }
        
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
    
    /**
     * DISCONNECT
     * Client disconnects
     */
    socket.on('disconnect', () => {
      console.log('❌ Interview client disconnected:', socket.id);
      
      if (currentSessionId) {
        socket.leave(`session:${currentSessionId}`);
      }
    });
  });
  
  console.log('✅ Interview WebSocket handlers initialized');
};

/**
 * Generate hint for current question
 */
function generateHint(turn) {
  const expectedComponents = turn.expectedComponents || {};
  const requiredConcepts = expectedComponents.requiredConcepts || [];
  
  if (requiredConcepts.length > 0) {
    const randomConcept = requiredConcepts[Math.floor(Math.random() * requiredConcepts.length)];
    return `💡 Consider discussing: ${randomConcept}`;
  }
  
  if (expectedComponents.idealStructure?.hasExample) {
    return '💡 Try including a specific example to illustrate your point';
  }
  
  if (expectedComponents.idealStructure?.hasTradeOff) {
    return '💡 Discuss the trade-offs or alternatives for this approach';
  }
  
  return '💡 Structure your answer: explain the concept, provide an example, and discuss use cases';
}

export default setupInterviewHandlers;

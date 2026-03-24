/**
 * mockInterviewSocket.js
 * Socket.IO handlers for the AI-augmented mock interview system.
 * Uses namespace /mock-interview to stay independent from /interview namespace.
 */
import {
  generateQuestion,
  evaluateAnswer,
  generateFollowUp,
  adaptDifficulty,
} from '../services/mockInterviewAIService.js';
import MockInterview from '../models/MockInterview.js';

/**
 * Register all /mock-interview socket listeners.
 * @param {import('socket.io').Server} io
 */
export default function registerMockInterviewSocket(io) {
  const nsp = io.of('/mock-interview');

  nsp.on('connection', (socket) => {
    console.log('[mockInterviewSocket] client connected:', socket.id);

    /* ────────────────────────────────────────────────
       join_room  { mockInterviewId, userId }
    ─────────────────────────────────────────────── */
    socket.on('join_room', ({ mockInterviewId, userId, role = 'candidate' }) => {
      socket.join(mockInterviewId);
      socket.mockInterviewId = mockInterviewId;
      socket.userId = userId;
      socket.role = role;

      // Notify others in room
      socket.to(mockInterviewId).emit('peer_joined', { userId, role, socketId: socket.id });
      console.log(`[mockInterviewSocket] ${userId} joined ${mockInterviewId} as ${role}`);
    });

    /* ────────────────────────────────────────────────
       request_ai_question
       { mockInterviewId, difficulty, askedQuestions, resumeText, jobDescription, skillGaps }
    ─────────────────────────────────────────────── */
    socket.on('request_ai_question', async (data) => {
      const roomId = data.mockInterviewId || socket.mockInterviewId;
      try {
        const session = await MockInterview.findById(roomId).lean();
        const question = await generateQuestion({
          interviewType: session?.type || 'technical',
          targetRole: session?.topics?.[0] || 'Software Engineer',
          difficulty: data.difficulty || session?.difficulty || 'medium',
          askedQuestions: data.askedQuestions || [],
          resumeText: data.resumeText || '',
          jobDescription: data.jobDescription || '',
          skillGaps: data.skillGaps || [],
        });

        // Emit to everyone in the room (interviewer + candidate see same question)
        nsp.to(roomId).emit('ai_question', { question, requestedBy: socket.userId });
      } catch (err) {
        socket.emit('ai_error', { event: 'request_ai_question', message: err.message });
      }
    });

    /* ────────────────────────────────────────────────
       submit_answer
       { mockInterviewId, questionText, questionType, answerText,
         expectedTopics, questionIndex, difficulty }
    ─────────────────────────────────────────────── */
    socket.on('submit_answer', async (data) => {
      const roomId = data.mockInterviewId || socket.mockInterviewId;
      try {
        const evaluation = await evaluateAnswer({
          questionText: data.questionText,
          questionType: data.questionType || 'technical',
          answerText: data.answerText || '',
          expectedTopics: data.expectedTopics || [],
        });

        const followUpQuestion = await generateFollowUp(
          data.questionText,
          data.answerText,
          evaluation
        );

        // Emit evaluation only to the candidate socket
        socket.emit('answer_evaluated', {
          questionIndex: data.questionIndex,
          evaluation,
          followUpQuestion,
        });

        // Emit to recruiter / interviewer if present (they see same eval)
        socket.to(roomId).emit('candidate_answered', {
          questionIndex: data.questionIndex,
          answerText: data.answerText,
          evaluation,
        });

        // Adapt difficulty
        const recentScores = data.recentScores || [evaluation.overallScore];
        const nextDifficulty = adaptDifficulty(recentScores, data.difficulty || 'medium');
        socket.emit('difficulty_updated', { nextDifficulty });
      } catch (err) {
        socket.emit('ai_error', { event: 'submit_answer', message: err.message });
      }
    });

    /* ────────────────────────────────────────────────
       recruiter_join  { mockInterviewId, userId, role: 'recruiter' }
    ─────────────────────────────────────────────── */
    socket.on('recruiter_join', ({ mockInterviewId, userId }) => {
      socket.join(mockInterviewId);
      socket.mockInterviewId = mockInterviewId;
      socket.userId = userId;
      socket.role = 'recruiter';

      socket.to(mockInterviewId).emit('recruiter_joined', { userId, socketId: socket.id });
      socket.emit('join_confirmed', { role: 'recruiter', mockInterviewId });
    });

    /* ────────────────────────────────────────────────
       recruiter_feedback  { mockInterviewId, comment, score }
    ─────────────────────────────────────────────── */
    socket.on('recruiter_feedback', (data) => {
      const roomId = data.mockInterviewId || socket.mockInterviewId;
      // Broadcast to all in room so candidate sees recruiter comment live
      nsp.to(roomId).emit('live_recruiter_feedback', {
        from: socket.userId,
        comment: data.comment,
        score: data.score,
        timestamp: Date.now(),
      });
    });

    /* ────────────────────────────────────────────────
       session_complete  { mockInterviewId }
    ─────────────────────────────────────────────── */
    socket.on('session_complete', ({ mockInterviewId }) => {
      nsp.to(mockInterviewId || socket.mockInterviewId).emit('mock_interview_ended', {
        triggeredBy: socket.userId,
      });
    });

    /* ────────────────────────────────────────────────
       chat_message  { mockInterviewId, text }
    ─────────────────────────────────────────────── */
    socket.on('chat_message', ({ mockInterviewId, text }) => {
      const roomId = mockInterviewId || socket.mockInterviewId;
      nsp.to(roomId).emit('chat_message', {
        from: socket.userId,
        role: socket.role,
        text,
        timestamp: Date.now(),
      });
    });

    /* ────────────────────────────────────────────────
       code_change  { mockInterviewId, code }
    ─────────────────────────────────────────────── */
    socket.on('code_change', ({ mockInterviewId, code }) => {
      socket.to(mockInterviewId || socket.mockInterviewId).emit('code_updated', { code });
    });

    /* ────────────────────────────────────────────────
       disconnect
    ─────────────────────────────────────────────── */
    socket.on('disconnect', () => {
      if (socket.mockInterviewId) {
        socket.to(socket.mockInterviewId).emit('peer_left', {
          userId: socket.userId,
          role: socket.role,
        });
      }
      console.log('[mockInterviewSocket] disconnected:', socket.id);
    });
  });
}

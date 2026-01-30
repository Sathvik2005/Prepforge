export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

export const QUESTION_TYPES = {
  MCQ: 'mcq',
  CODING: 'coding',
  BEHAVIORAL: 'behavioral',
};

export const TOPICS = [
  'Arrays',
  'Strings',
  'LinkedLists',
  'Trees',
  'Graphs',
  'DynamicProgramming',
  'Greedy',
  'Sorting',
  'Searching',
  'SystemDesign',
  'JavaScript',
  'React',
  'Databases',
];

export const MOCK_INTERVIEW_ROUNDS = {
  MCQ: 30, // minutes
  CODING: 60,
  BEHAVIORAL: 45,
};

export const POMODORO_SETTINGS = {
  FOCUS: 25, // minutes
  SHORT_BREAK: 5,
  LONG_BREAK: 15,
  SESSIONS_BEFORE_LONG_BREAK: 4,
};

export const ANIMATION_DURATIONS = {
  FAST: 300,
  NORMAL: 600,
  SLOW: 1000,
};

export const STREAK_MILESTONES = [7, 14, 30, 60, 100, 365];

export const BADGES = [
  { id: 1, name: 'First Step', requirement: 'Solve 1 problem', icon: '🎯' },
  { id: 2, name: '7-Day Streak', requirement: 'Maintain 7-day streak', icon: '🔥' },
  { id: 3, name: '100 Problems', requirement: 'Solve 100 problems', icon: '💯' },
  { id: 4, name: 'Mock Master', requirement: 'Complete 10 mock interviews', icon: '🎭' },
  { id: 5, name: 'Code Ninja', requirement: 'Solve 50 coding problems', icon: '🥷' },
  { id: 6, name: 'Top 10%', requirement: 'Rank in top 10% accuracy', icon: '🏆' },
  { id: 7, name: 'Speed Demon', requirement: 'Solve 10 problems under time', icon: '⚡' },
  { id: 8, name: 'Perfectionist', requirement: '100% accuracy on 20 problems', icon: '✨' },
];

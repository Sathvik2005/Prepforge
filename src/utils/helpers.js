// Format date to readable string
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

// Format time in seconds to MM:SS
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Calculate days between dates
export const daysBetween = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((new Date(date1) - new Date(date2)) / oneDay));
};

// Calculate accuracy percentage
export const calculateAccuracy = (correct, total) => {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
};

// Get difficulty color
export const getDifficultyColor = (difficulty) => {
  const colors = {
    easy: 'green',
    medium: 'yellow',
    hard: 'red',
  };
  return colors[difficulty] || 'gray';
};

// Get topic icon
export const getTopicIcon = (topic) => {
  const icons = {
    Arrays: '📊',
    Strings: '📜',
    LinkedLists: '🔗',
    Trees: '🌳',
    Graphs: '🕸️',
    DynamicProgramming: '🧮',
    Greedy: '💰',
    Sorting: '🔀',
    Searching: '🔍',
    SystemDesign: '🏛️',
    JavaScript: '📜',
    React: '⚛️',
    Databases: '🗄️',
  };
  return icons[topic] || '📝';
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Truncate text
export const truncate = (text, length) => {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

// Generate random ID
export const generateId = () => {
  return Math.random().toString(36).substring(2, 9);
};

// Check if streak is maintained
export const isStreakMaintained = (lastActive) => {
  const now = new Date();
  const last = new Date(lastActive);
  const diffHours = Math.abs(now - last) / 36e5;
  return diffHours <= 24;
};

// Calculate XP from activities
export const calculateXP = (activities) => {
  const xpMap = {
    question: 10,
    mockInterview: 50,
    streak: 5,
    badge: 100,
  };

  return activities.reduce((total, activity) => {
    return total + (xpMap[activity.type] || 0);
  }, 0);
};

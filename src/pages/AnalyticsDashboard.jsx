import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, Target, Clock, Calendar,
  Award, Activity, Brain, Zap, Users, AlertCircle
} from 'lucide-react';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30); // days
  const [dashboardData, setDashboardData] = useState(null);
  const [trends, setTrends] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [strengthsWeaknesses, setStrengthsWeaknesses] = useState(null);
  const [studyPatterns, setStudyPatterns] = useState(null);
  const [topicMastery, setTopicMastery] = useState({});
  const [leaderboard, setLeaderboard] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch all analytics data in parallel
      const [
        dashboardRes,
        trendsRes,
        predictionsRes,
        strengthsWeaknessesRes,
        studyPatternsRes,
        topicMasteryRes,
        leaderboardRes
      ] = await Promise.all([
        fetch(`/api/analytics/dashboard?days=${timeRange}`, { headers }),
        fetch(`/api/analytics/trends?days=${timeRange}`, { headers }),
        fetch('/api/analytics/predictions', { headers }),
        fetch('/api/analytics/strengths-weaknesses', { headers }),
        fetch('/api/analytics/study-patterns', { headers }),
        fetch('/api/analytics/topic-mastery', { headers }),
        fetch('/api/analytics/leaderboard', { headers })
      ]);

      const dashboard = await dashboardRes.json();
      const trendsData = await trendsRes.json();
      const predictionsData = await predictionsRes.json();
      const strengthsWeaknessesData = await strengthsWeaknessesRes.json();
      const studyPatternsData = await studyPatternsRes.json();
      const topicMasteryData = await topicMasteryRes.json();
      const leaderboardData = await leaderboardRes.json();

      setDashboardData(dashboard.data);
      setTrends(trendsData.data || []);
      setPredictions(predictionsData.data);
      setStrengthsWeaknesses(strengthsWeaknessesData.data);
      setStudyPatterns(studyPatternsData.data);
      setTopicMastery(topicMasteryData.data || {});
      setLeaderboard(leaderboardData.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getConfidenceColor = (level) => {
    switch (level) {
      case 'high': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'low': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  // Transform topic mastery data for radar chart
  const radarData = Object.entries(topicMastery).map(([topic, data]) => ({
    topic: topic.substring(0, 15),
    score: data.score,
    fullName: topic
  }));

  if (loading) {
    return (
      <div className="analytics-dashboard loading">
        <div className="spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>
            <Activity className="icon" />
            Analytics Dashboard
          </h1>
          <p>Comprehensive insights into your preparation progress</p>
        </div>
        
        <div className="time-range-selector">
          <button
            className={timeRange === 7 ? 'active' : ''}
            onClick={() => setTimeRange(7)}
          >
            7 Days
          </button>
          <button
            className={timeRange === 30 ? 'active' : ''}
            onClick={() => setTimeRange(30)}
          >
            30 Days
          </button>
          <button
            className={timeRange === 90 ? 'active' : ''}
            onClick={() => setTimeRange(90)}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {predictions && (
        <div className="metrics-grid">
          <div className="metric-card readiness">
            <div className="metric-icon">
              <Target />
            </div>
            <div className="metric-content">
              <div className="metric-label">Readiness Score</div>
              <div
                className="metric-value"
                style={{ color: getScoreColor(predictions.readinessScore) }}
              >
                {predictions.readinessScore}%
              </div>
              <div className="metric-subtitle">
                {predictions.daysToReadiness === 0
                  ? 'You\'re ready! 🎉'
                  : predictions.daysToReadiness < 999
                  ? `${predictions.daysToReadiness} days to target`
                  : 'Keep practicing'}
              </div>
            </div>
          </div>

          <div className="metric-card confidence">
            <div className="metric-icon">
              <Brain />
            </div>
            <div className="metric-content">
              <div className="metric-label">Confidence Level</div>
              <div
                className="metric-value"
                style={{ color: getConfidenceColor(predictions.confidenceLevel) }}
              >
                {predictions.confidenceLevel.toUpperCase()}
              </div>
              <div className="metric-subtitle">
                Pass Probability: {predictions.estimatedPassProbability}%
              </div>
            </div>
          </div>

          {leaderboard && (
            <div className="metric-card ranking">
              <div className="metric-icon">
                <Users />
              </div>
              <div className="metric-content">
                <div className="metric-label">Your Ranking</div>
                <div className="metric-value">
                  #{leaderboard.position}
                </div>
                <div className="metric-subtitle">
                  Top {leaderboard.percentile}% of {leaderboard.totalUsers} users
                </div>
              </div>
            </div>
          )}

          {studyPatterns && (
            <div className="metric-card frequency">
              <div className="metric-icon">
                <Calendar />
              </div>
              <div className="metric-content">
                <div className="metric-label">Study Frequency</div>
                <div className="metric-value">
                  {studyPatterns.studyFrequency.toFixed(1)}x
                </div>
                <div className="metric-subtitle">
                  sessions per week
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Trends */}
      {trends.length > 0 && (
        <div className="chart-container">
          <div className="chart-header">
            <h2>
              <TrendingUp />
              Performance Trends
            </h2>
            <p>Track your accuracy and speed over time</p>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trends.map(t => ({
              ...t,
              date: formatDate(t.date)
            }))}>
              <defs>
                <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="accuracy"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorAccuracy)"
                name="Accuracy %"
              />
              <Area
                type="monotone"
                dataKey="speed"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorSpeed)"
                name="Speed (q/hr)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Topic Mastery Radar Chart */}
      {radarData.length > 0 && (
        <div className="chart-container">
          <div className="chart-header">
            <h2>
              <Zap />
              Topic Mastery
            </h2>
            <p>Your proficiency across different topics</p>
          </div>
          
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="topic"
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#6b7280' }}
              />
              <Radar
                name="Mastery Score"
                dataKey="score"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.6}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Readiness Progress */}
      {trends.length > 0 && (
        <div className="chart-container">
          <div className="chart-header">
            <h2>
              <Target />
              Readiness Progress
            </h2>
            <p>Your journey towards interview readiness</p>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends.map(t => ({
              ...t,
              date: formatDate(t.date)
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="readinessScore"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', r: 4 }}
                name="Readiness Score"
              />
              {/* Target line */}
              <Line
                type="monotone"
                data={trends.map(t => ({ ...t, target: 80 }))}
                dataKey="target"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Target (80%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Strengths and Weaknesses */}
      {strengthsWeaknesses && (
        <div className="strengths-weaknesses-grid">
          <div className="strengths-card">
            <div className="card-header">
              <h3>
                <Award className="icon-success" />
                Your Strengths
              </h3>
            </div>
            <div className="topics-list">
              {strengthsWeaknesses.strengths.length > 0 ? (
                strengthsWeaknesses.strengths.map((strength, idx) => (
                  <div key={idx} className="topic-item strength">
                    <div className="topic-info">
                      <div className="topic-name">{strength.topic}</div>
                      <div className="topic-meta">
                        Accuracy: {strength.accuracy.toFixed(1)}%
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill success"
                        style={{ width: `${strength.accuracy}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-state">
                  Keep practicing to identify your strengths!
                </p>
              )}
            </div>
          </div>

          <div className="weaknesses-card">
            <div className="card-header">
              <h3>
                <AlertCircle className="icon-warning" />
                Areas to Improve
              </h3>
            </div>
            <div className="topics-list">
              {strengthsWeaknesses.weaknesses.length > 0 ? (
                strengthsWeaknesses.weaknesses.map((weakness, idx) => (
                  <div key={idx} className="topic-item weakness">
                    <div className="topic-info">
                      <div className="topic-name">{weakness.topic}</div>
                      <div className="topic-meta">
                        Accuracy: {weakness.accuracy.toFixed(1)}%
                        {weakness.recommendedFocus && (
                          <span className="focus-badge">Focus</span>
                        )}
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill warning"
                        style={{ width: `${weakness.accuracy}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-state">
                  Great job! No weak areas identified.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Study Patterns */}
      {studyPatterns && (
        <div className="study-patterns-card">
          <div className="card-header">
            <h3>
              <Clock />
              Study Patterns
            </h3>
            <p>Insights into your learning habits</p>
          </div>
          
          <div className="patterns-grid">
            <div className="pattern-item">
              <div className="pattern-label">Preferred Time</div>
              <div className="pattern-value">
                {studyPatterns.preferredTime.charAt(0).toUpperCase() +
                  studyPatterns.preferredTime.slice(1)}
              </div>
            </div>
            
            <div className="pattern-item">
              <div className="pattern-label">Average Session</div>
              <div className="pattern-value">
                {studyPatterns.averageSessionLength} min
              </div>
            </div>
            
            <div className="pattern-item">
              <div className="pattern-label">Most Productive</div>
              <div className="pattern-value">
                {studyPatterns.mostProductiveDay}
              </div>
            </div>
            
            <div className="pattern-item">
              <div className="pattern-label">Weekly Sessions</div>
              <div className="pattern-value">
                {studyPatterns.studyFrequency.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suggested Focus Areas */}
      {predictions && predictions.suggestedFocusAreas.length > 0 && (
        <div className="focus-areas-card">
          <div className="card-header">
            <h3>
              <Brain />
              Suggested Focus Areas
            </h3>
            <p>Topics that need more attention</p>
          </div>
          
          <div className="focus-areas-list">
            {predictions.suggestedFocusAreas.map((topic, idx) => (
              <div key={idx} className="focus-area-chip">
                {topic}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;

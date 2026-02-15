import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
  BookOpen, 
  Code, 
  Trophy, 
  CheckCircle, 
  PlayCircle,
  FileText,
  Database,
  Cpu,
  Network,
  GitBranch,
  Zap,
  Brain,
  ChevronRight,
  Star,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { showError } from '../utils/toast';
import { progressAPI, sheetsAPI } from '../services/api';
import { useTracking } from '../contexts/TrackingContext';

gsap.registerPlugin(ScrollTrigger);

const DSASheets = () => {
  const { currentUser } = useAuth();
  const { trackPageView, track } = useTracking();
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [sheets, setSheets] = useState([]);
  const [sheetsLoading, setSheetsLoading] = useState(true);
  const containerRef = useRef(null);

  // Track page view
  useEffect(() => {
    trackPageView('/dsa-sheets');
  }, [trackPageView]);

  useEffect(() => {
    loadSheets();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadUserProgress();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    // GSAP animations for cards
    const cards = document.querySelectorAll('.sheet-card');
    gsap.fromTo(cards,
      {
        opacity: 0,
        y: 80,
        scale: 0.9,
        rotateX: -15,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        rotateX: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 75%',
        },
      }
    );

    // Floating animation for icons
    gsap.to('.sheet-icon', {
      y: -6,
      duration: 2.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: 0.15,
    });

    // Pulse animation for progress bars
    gsap.to('.progress-glow', {
      boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }, [loading]);

  const loadSheets = async () => {
    try {
      const response = await sheetsAPI.getAll();
      const apiSheets = response.data?.data || response.data || [];
      
      // If API returns sheets, map them
      if (apiSheets.length > 0) {
        const mappedSheets = apiSheets.map((sheet) => {
          // Determine icon based on sheet type or slug
          let icon = BookOpen;
          let color = 'bg-royal-600';
          
          if (sheet.slug === 'blind-75') {
            icon = Trophy;
            color = 'bg-navy-700';
          } else if (sheet.slug === 'sde-sheet') {
            icon = Code;
            color = 'bg-royal-700';
          } else if (sheet.slug === 'a2z-dsa') {
            icon = BookOpen;
            color = 'bg-royal-600';
          }
          
          return {
            id: sheet.slug,
            title: sheet.title,
            description: sheet.description,
            icon,
            color,
            problems: sheet.totalProblems,
            hasTrack: true
          };
        });
        
        setSheets(mappedSheets);
        setSheetsLoading(false);
        return;
      }
      
      // If API returns empty, fall through to fallback
    } catch (error) {
      console.error('Failed to load sheets from API:', error);
    }
    
    // Always set fallback sheets (either API failed or returned empty)
    console.log('Using fallback sheets');
    setSheets([
      {
        id: 'a2z-dsa',
        title: 'A2Z DSA Sheet - Complete DSA Roadmap',
        description: 'Complete Data Structures and Algorithms roadmap from basics to advanced',
        icon: BookOpen,
        color: 'bg-royal-600',
        problems: 78,
        hasTrack: true
      },
      {
        id: 'blind-75',
        title: 'Blind 75 - Must-Do Coding Interview Problems',
        description: 'Curated list of 75 essential coding interview problems',
        icon: Trophy,
        color: 'bg-navy-700',
        problems: 75,
        hasTrack: true
      },
      {
        id: 'sde-sheet',
        title: "Striver's SDE Sheet - Top Coding Interview Problems",
        description: 'Most frequently asked interview questions for SDE roles',
        icon: Code,
        color: 'bg-royal-700',
        problems: 140,
        hasTrack: true
      }
    ]);
    setSheetsLoading(false);
  };

  const loadUserProgress = async () => {
    try {
      const response = await progressAPI.getAll();
      setProgress(response.data || {});
    } catch (error) {
      console.error('Failed to load progress:', error);
      // Don't show error toast, just silently fail for better UX
      setProgress({});
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();
  const handleSheetClick = (sheetId) => {
    // Allow viewing sheets without authentication
    navigate(`/dsa-sheets/${sheetId}`);
  };

  const handleTrackClick = (sheetId) => {
    // Allow viewing tracking without authentication
    navigate(`/dsa-sheets/${sheetId}/track`);
  };

  const handleStartLearning = (courseId) => {
    if (!currentUser) {
      showError('Please sign in to start learning');
      return;
    }
    // Navigate to course page
    navigate(`/practice?course=${courseId}`);
  };

  const coreCSSubjects = [
    {
      id: 'cn-sheet',
      title: 'CN Sheet',
      description: 'Most Asked Computer Networks Interview Questions',
      icon: Network,
      color: 'bg-royal-600',
      topics: 50
    },
    {
      id: 'dbms-sheet',
      title: 'DBMS Sheet',
      description: 'Most Asked DBMS Interview Questions',
      icon: Database,
      color: 'bg-navy-700',
      topics: 45
    },
    {
      id: 'os-sheet',
      title: 'OS Sheet',
      description: 'Most Asked Operating System Interview Questions',
      icon: Cpu,
      color: 'bg-royal-700',
      topics: 40
    },
    {
      id: 'system-design',
      title: 'System Design Sheet',
      description: 'Master HLD from Basics to Advanced',
      icon: GitBranch,
      color: 'bg-navy-800',
      topics: 60
    }
  ];

  const dsaPlaylist = [
    {
      id: 'array',
      title: 'Array',
      description: 'Learn from Basics to Advanced',
      icon: '📊',
      color: 'bg-royal-600',
      videos: 45
    },
    {
      id: 'binary-search',
      title: 'Binary Search',
      description: 'Learn from Basics to Advanced',
      icon: '🔍',
      color: 'bg-navy-700',
      videos: 30
    },
    {
      id: 'dynamic-programming',
      title: 'Dynamic Programming',
      description: 'Learn from Basics to Advanced',
      icon: '🧮',
      color: 'bg-royal-700',
      videos: 56
    },
    {
      id: 'graphs',
      title: 'Graphs',
      description: 'Learn from Basics to Advanced',
      icon: '🕸️',
      color: 'bg-navy-800',
      videos: 54
    },
    {
      id: 'linked-lists',
      title: 'Linked Lists',
      description: 'Learn from Basics to Advanced',
      icon: '🔗',
      color: 'bg-royal-800',
      videos: 28
    },
    {
      id: 'recursion',
      title: 'Recursion',
      description: 'Learn from Basics to Advanced',
      icon: '🔄',
      color: 'bg-navy-600',
      videos: 25
    },
    {
      id: 'stack-queue',
      title: 'Stack and Queue',
      description: 'Learn from Basics to Advanced',
      icon: '📚',
      color: 'bg-royal-500',
      videos: 32
    },
    {
      id: 'strings',
      title: 'Strings',
      description: 'Learn from Basics to Advanced',
      icon: '📝',
      color: 'bg-navy-700',
      videos: 38
    },
    {
      id: 'trees',
      title: 'Trees',
      description: 'Learn from Basics to Advanced',
      icon: '🌲',
      color: 'bg-royal-600',
      videos: 42
    }
  ];

  const competitiveProgramming = [
    {
      id: 'cp-sheet',
      title: 'CP Sheet',
      description: 'Level up your CP with our curated sheet.',
      icon: TrendingUp,
      color: 'bg-royal-600',
      problems: 200
    }
  ];

  const blogs = [
    {
      id: 'arrays-blog',
      title: 'Arrays',
      description: 'Fundamental data structure for storing elements of the same type.',
      icon: FileText,
      color: 'bg-royal-600'
    },
    {
      id: 'intro-dsa',
      title: 'Introduction to DSA',
      description: 'Primer on Data Structures and Algorithms.',
      icon: Brain,
      color: 'bg-navy-700'
    },
    {
      id: 'binary-search-blog',
      title: 'Binary Search',
      description: 'Efficient searching algorithm for sorted arrays.',
      icon: Star,
      color: 'bg-royal-700'
    },
    {
      id: 'bst-blog',
      title: 'Binary Search Tree',
      description: 'Hierarchical data structure with efficient search, insertion, and deletion operations.',
      icon: GitBranch,
      color: 'bg-navy-800'
    }
  ];

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 text-navy-900 dark:text-white pt-24">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-16"
      >
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-5xl md:text-7xl font-bold mb-6 text-navy-900 dark:text-white"
          >
            Master <span className="text-royal-600">DSA</span> & CS Fundamentals
          </motion.h1>
          <p className="text-xl text-surface-600 dark:text-surface-300 max-w-3xl mx-auto">
            Comprehensive learning resources curated by experts. Practice, track progress, and ace your interviews.
          </p>
        </div>

        {/* DSA Sheets Section */}
        <section className="mb-20">
          <div className="flex items-center mb-8">
            <BookOpen className="w-8 h-8 text-royal-600 mr-3" />
            <h2 className="text-4xl font-bold text-navy-900 dark:text-white">DSA Sheets</h2>
          </div>
          {sheetsLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-royal-600"></div>
              <p className="mt-4 text-surface-600 dark:text-surface-400">Loading sheets...</p>
            </div>
          ) : sheets.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-surface-400 mx-auto mb-4" />
              <p className="text-surface-600 dark:text-surface-400">No sheets available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sheets.map((sheet, index) => (
                <motion.div
                  key={sheet.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700 hover:border-royal-300 dark:hover:border-royal-600 transition-all group shadow-soft"
                >
                  <div className={`w-16 h-16 rounded-lg ${sheet.color} flex items-center justify-center mb-4 shadow-soft-md`}>
                    <sheet.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-navy-900 dark:text-white">{sheet.title}</h3>
                  <p className="text-surface-600 dark:text-surface-400 mb-4">{sheet.description}</p>
                  <div className="flex items-center text-sm text-surface-500 mb-6">
                    <Code className="w-4 h-4 mr-1" />
                    <span>{sheet.problems} Problems</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSheetClick(sheet.id)}
                      className={`flex-1 ${sheet.color} text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-soft-md`}
                    >
                      <FileText className="w-4 h-4" />
                      Sheet
                    </button>
                    <button
                      onClick={() => handleTrackClick(sheet.id)}
                      className="flex-1 bg-surface-100 dark:bg-surface-700 text-navy-900 dark:text-white px-4 py-2 rounded-lg font-semibold hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Track
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Core CS Subjects Section */}
        <section className="mb-20">
          <div className="flex items-center mb-8">
            <Database className="w-8 h-8 text-royal-600 mr-3" />
            <h2 className="text-4xl font-bold text-navy-900 dark:text-white">Core CS Subjects</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreCSSubjects.map((subject, index) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700 hover:border-royal-300 dark:hover:border-royal-600 transition-all group shadow-soft"
              >
                <div className={`w-16 h-16 rounded-lg ${subject.color} flex items-center justify-center mb-4 shadow-soft-md`}>
                  <subject.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-navy-900 dark:text-white">{subject.title}</h3>
                <p className="text-surface-600 dark:text-surface-400 mb-4">{subject.description}</p>
                <div className="flex items-center text-sm text-surface-500 mb-6">
                  <FileText className="w-4 h-4 mr-1" />
                  <span>{subject.topics} Topics</span>
                </div>
                <button
                  onClick={() => handleStartLearning(subject.id)}
                  className={`w-full ${subject.color} text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-soft-md`}
                >
                  <PlayCircle className="w-4 h-4" />
                  Start Learning
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* DSA Playlist Section */}
        <section className="mb-20">
          <div className="flex items-center mb-8">
            <PlayCircle className="w-8 h-8 text-royal-600 mr-3" />
            <h2 className="text-4xl font-bold text-navy-900 dark:text-white">DSA Playlist</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dsaPlaylist.map((playlist, index) => (
              <motion.div
                key={playlist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700 hover:border-royal-300 dark:hover:border-royal-600 transition-all group shadow-soft"
              >
                <div className={`w-16 h-16 rounded-lg ${playlist.color} flex items-center justify-center mb-4 text-3xl shadow-soft-md`}>
                  {playlist.icon}
                </div>
                <h3 className="text-2xl font-bold mb-2 text-navy-900 dark:text-white">{playlist.title}</h3>
                <p className="text-surface-600 dark:text-surface-400 mb-4">{playlist.description}</p>
                <div className="flex items-center text-sm text-surface-500 mb-6">
                  <PlayCircle className="w-4 h-4 mr-1" />
                  <span>{playlist.videos} Videos</span>
                </div>
                <button
                  onClick={() => handleStartLearning(playlist.id)}
                  className={`w-full ${playlist.color} text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 group-hover:scale-105 transition-transform shadow-soft-md`}
                >
                  <PlayCircle className="w-4 h-4" />
                  Start Learning
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Competitive Programming Section */}
        <section className="mb-20">
          <div className="flex items-center mb-8">
            <Trophy className="w-8 h-8 text-warning-600 mr-3" />
            <h2 className="text-4xl font-bold text-navy-900 dark:text-white">Competitive Programming</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitiveProgramming.map((cp, index) => (
              <motion.div
                key={cp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700 hover:border-royal-300 dark:hover:border-royal-600 transition-all group shadow-soft"
              >
                <div className={`w-16 h-16 rounded-lg ${cp.color} flex items-center justify-center mb-4 shadow-soft-md`}>
                  <cp.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-navy-900 dark:text-white">{cp.title}</h3>
                <p className="text-surface-600 dark:text-surface-400 mb-4">{cp.description}</p>
                <div className="flex items-center text-sm text-surface-500 mb-6">
                  <Code className="w-4 h-4 mr-1" />
                  <span>{cp.problems} Problems</span>
                </div>
                <button
                  onClick={() => handleStartLearning(cp.id)}
                  className={`w-full ${cp.color} text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-soft-md`}
                >
                  <PlayCircle className="w-4 h-4" />
                  Start Learning
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Blogs Section */}
        <section className="mb-20">
          <div className="flex items-center mb-8">
            <FileText className="w-8 h-8 text-royal-600 mr-3" />
            <h2 className="text-4xl font-bold text-navy-900 dark:text-white">Blogs</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {blogs.map((blog, index) => (
              <motion.div
                key={blog.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700 hover:border-royal-300 dark:hover:border-royal-600 transition-all group cursor-pointer shadow-soft"
                onClick={() => handleStartLearning(blog.id)}
              >
                <div className={`w-16 h-16 rounded-lg ${blog.color} flex items-center justify-center mb-4 shadow-soft-md`}>
                  <blog.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-navy-900 dark:text-white">{blog.title}</h3>
                <p className="text-surface-600 dark:text-surface-400 mb-4 text-sm">{blog.description}</p>
                <button
                  className={`w-full ${blog.color} text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-soft-md`}
                >
                  <PlayCircle className="w-4 h-4" />
                  Start Learning
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-royal-600 rounded-2xl p-12 text-center shadow-soft-lg"
        >
          <h3 className="text-4xl font-bold mb-4 text-white">Ready to Start Your Journey?</h3>
          <p className="text-xl mb-8 text-white/90">
            Join thousands of students mastering DSA and CS fundamentals
          </p>
          {!currentUser && (
            <button
              onClick={() => navigate('/register')}
              className="bg-white text-royal-700 px-8 py-4 rounded-lg font-bold text-lg hover:bg-surface-50 transition-colors inline-flex items-center gap-2 shadow-soft-md"
            >
              Get Started Free
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DSASheets;

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Circle, Star, Filter, Search, Command, 
  BookOpen, ExternalLink, Youtube, FileText, Clock, 
  TrendingUp, Award, ChevronDown, ChevronUp, X, Hash,
  BarChart3, Target, Zap, StickyNote, RotateCcw
} from 'lucide-react';
import { sheetsAPI } from '../services/api';
import { showError, showSuccess } from '../utils/toast';
import { useAuth } from '../contexts/AuthContext';

const SheetDetail = () => {
  const { sheetId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [noteContent, setNoteContent] = useState('');

  // Fallback sheet data when API is unavailable
  const getFallbackSheet = (slug) => {
    const fallbackSheets = {
      'a2z-dsa': {
        slug: 'a2z-dsa',
        title: 'A2Z DSA Sheet - Complete DSA Roadmap',
        description: 'Complete Data Structures and Algorithms roadmap from basics to advanced',
        type: 'dsa',
        totalProblems: 78,
        sections: [
          {
            title: 'Learn the Basics',
            slug: 'basics',
            order: 1,
            problems: [
              { title: 'User Input / Output', slug: 'user-input-output', difficulty: 'Easy', topic: 'Basics', platform: 'TakeUForward', solveLink: 'https://takeuforward.org/arrays/user-input-output/', editorialLink: 'https://takeuforward.org/arrays/user-input-output/', tags: ['basics', 'io'] },
              { title: 'Data Types', slug: 'data-types', difficulty: 'Easy', topic: 'Basics', platform: 'TakeUForward', solveLink: 'https://takeuforward.org/data-types/', editorialLink: 'https://takeuforward.org/data-types/', tags: ['basics', 'data-types'] },
              { title: 'If Else Statements', slug: 'if-else', difficulty: 'Easy', topic: 'Basics', platform: 'TakeUForward', solveLink: 'https://takeuforward.org/conditionals/', tags: ['basics', 'conditionals'] },
              { title: 'Switch Statement', slug: 'switch-statement', difficulty: 'Easy', topic: 'Basics', platform: 'TakeUForward', solveLink: 'https://takeuforward.org/switch/', tags: ['basics', 'conditionals'] },
              { title: 'What are Arrays & Strings', slug: 'arrays-strings', difficulty: 'Easy', topic: 'Basics', platform: 'TakeUForward', solveLink: 'https://takeuforward.org/arrays/', tags: ['basics', 'arrays'] },
            ]
          },
          {
            title: 'Arrays - Part 1',
            slug: 'arrays-1',
            order: 2,
            problems: [
              { title: 'Largest Element in Array', slug: 'largest-element', difficulty: 'Easy', topic: 'Arrays', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/largest-number/', editorialLink: 'https://takeuforward.org/arrays/largest-element/', tags: ['arrays', 'easy'] },
              { title: 'Second Largest Element', slug: 'second-largest', difficulty: 'Easy', topic: 'Arrays', platform: 'GeeksforGeeks', solveLink: 'https://practice.geeksforgeeks.org/problems/second-largest/', tags: ['arrays', 'easy'] },
              { title: 'Check if Array is Sorted', slug: 'is-sorted', difficulty: 'Easy', topic: 'Arrays', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/check-if-array-is-sorted/', tags: ['arrays', 'easy'] },
              { title: 'Remove Duplicates from Sorted Array', slug: 'remove-duplicates', difficulty: 'Easy', topic: 'Arrays', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/remove-duplicates-from-sorted-array/', youtubeLink: 'https://www.youtube.com/watch?v=K6P5zKTxWIk', tags: ['arrays', 'two-pointers'] },
            ]
          }
        ],
        userProgress: { 
          completedProblemSlugs: [], 
          revisionProblemSlugs: [], 
          notes: {} 
        }
      },
      'blind-75': {
        slug: 'blind-75',
        title: 'Blind 75 - Must-Do Coding Interview Problems',
        description: 'Curated list of 75 essential coding interview problems',
        type: 'interview',
        totalProblems: 75,
        sections: [
          {
            title: 'Array',
            slug: 'array',
            order: 1,
            problems: [
              { title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy', topic: 'Array', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/two-sum/', editorialLink: 'https://leetcode.com/problems/two-sum/editorial/', youtubeLink: 'https://www.youtube.com/watch?v=KLlXCFG5TnA', tags: ['hashmap', 'array'] },
              { title: 'Best Time to Buy and Sell Stock', slug: 'best-time-to-buy-and-sell-stock', difficulty: 'Easy', topic: 'Array', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/', youtubeLink: 'https://www.youtube.com/watch?v=1pkOgXD63yU', tags: ['array', 'greedy'] },
              { title: 'Contains Duplicate', slug: 'contains-duplicate', difficulty: 'Easy', topic: 'Array', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/contains-duplicate/', youtubeLink: 'https://www.youtube.com/watch?v=3OamzN90kPg', tags: ['hashmap', 'array'] },
              { title: 'Product of Array Except Self', slug: 'product-except-self', difficulty: 'Medium', topic: 'Array', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/product-of-array-except-self/', youtubeLink: 'https://www.youtube.com/watch?v=bNvIQI2wAjk', tags: ['array', 'prefix-sum'] },
              { title: 'Maximum Subarray', slug: 'maximum-subarray', difficulty: 'Medium', topic: 'Array', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/maximum-subarray/', youtubeLink: 'https://www.youtube.com/watch?v=5WZl3MMT0Eg', tags: ['array', 'kadane'] },
            ]
          },
          {
            title: 'Binary',
            slug: 'binary',
            order: 2,
            problems: [
              { title: 'Sum of Two Integers', slug: 'sum-two-integers', difficulty: 'Medium', topic: 'Binary', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/sum-of-two-integers/', tags: ['bit-manipulation'] },
              { title: 'Number of 1 Bits', slug: 'number-of-1-bits', difficulty: 'Easy', topic: 'Binary', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/number-of-1-bits/', tags: ['bit-manipulation'] },
              { title: 'Counting Bits', slug: 'counting-bits', difficulty: 'Easy', topic: 'Binary', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/counting-bits/', tags: ['bit-manipulation', 'dp'] },
            ]
          },
          {
            title: 'Dynamic Programming',
            slug: 'dp',
            order: 3,
            problems: [
              { title: 'Climbing Stairs', slug: 'climbing-stairs', difficulty: 'Easy', topic: 'DP', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/climbing-stairs/', youtubeLink: 'https://www.youtube.com/watch?v=Y0lT9Fck7qI', tags: ['dp', 'fibonacci'] },
              { title: 'Coin Change', slug: 'coin-change', difficulty: 'Medium', topic: 'DP', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/coin-change/', youtubeLink: 'https://www.youtube.com/watch?v=H9bfqozjoqs', tags: ['dp', 'unbounded-knapsack'] },
              { title: 'Longest Increasing Subsequence', slug: 'lis', difficulty: 'Medium', topic: 'DP', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/longest-increasing-subsequence/', tags: ['dp', 'binary-search'] },
            ]
          }
        ],
        userProgress: { 
          completedProblemSlugs: [], 
          revisionProblemSlugs: [], 
          notes: {} 
        }
      },
      'sde-sheet': {
        slug: 'sde-sheet',
        title: "Striver's SDE Sheet - Top Coding Interview Problems",
        description: 'Most frequently asked interview questions for SDE roles',
        type: 'dsa',
        totalProblems: 140,
        sections: [
          {
            title: 'Arrays',
            slug: 'arrays',
            order: 1,
            problems: [
              { title: 'Set Matrix Zeroes', slug: 'set-matrix-zeroes', difficulty: 'Medium', topic: 'Arrays', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/set-matrix-zeroes/', editorialLink: 'https://takeuforward.org/data-structure/set-matrix-zero/', youtubeLink: 'https://www.youtube.com/watch?v=M65xBewcqcI', tags: ['matrix', 'in-place'] },
              { title: "Pascal's Triangle", slug: 'pascals-triangle', difficulty: 'Easy', topic: 'Arrays', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/pascals-triangle/', editorialLink: 'https://takeuforward.org/data-structure/pascal-triangle/', youtubeLink: 'https://www.youtube.com/watch?v=6FLvhQjZqvM', tags: ['math', 'arrays'] },
              { title: 'Next Permutation', slug: 'next-permutation', difficulty: 'Medium', topic: 'Arrays', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/next-permutation/', editorialLink: 'https://takeuforward.org/data-structure/next-permutation/', youtubeLink: 'https://www.youtube.com/watch?v=LuLCLgMElus', tags: ['arrays', 'permutation'] },
              { title: 'Maximum Subarray (Kadane)', slug: 'maximum-subarray', difficulty: 'Medium', topic: 'Arrays', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/maximum-subarray/', editorialLink: 'https://takeuforward.org/data-structure/kadanes-algorithm/', youtubeLink: 'https://www.youtube.com/watch?v=w_KEoQvnH-o', tags: ['arrays', 'kadane'] },
              { title: 'Sort Colors (Dutch National Flag)', slug: 'sort-colors', difficulty: 'Medium', topic: 'Arrays', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/sort-colors/', youtubeLink: 'https://www.youtube.com/watch?v=oaVa-9wmpns', tags: ['arrays', 'sorting', 'two-pointers'] },
            ]
          },
          {
            title: 'Linked List',
            slug: 'linked-list',
            order: 2,
            problems: [
              { title: 'Reverse Linked List', slug: 'reverse-linked-list', difficulty: 'Easy', topic: 'Linked List', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/reverse-linked-list/', editorialLink: 'https://takeuforward.org/data-structure/reverse-linked-list/', youtubeLink: 'https://www.youtube.com/watch?v=iRtLEoL-r-g', tags: ['linked-list'] },
              { title: 'Middle of Linked List', slug: 'middle-linked-list', difficulty: 'Easy', topic: 'Linked List', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/middle-of-the-linked-list/', tags: ['linked-list', 'two-pointers'] },
              { title: 'Merge Two Sorted Lists', slug: 'merge-two-sorted-lists', difficulty: 'Easy', topic: 'Linked List', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/merge-two-sorted-lists/', youtubeLink: 'https://www.youtube.com/watch?v=XIdigk956u0', tags: ['linked-list', 'merge'] },
              { title: 'Remove N-th Node From End', slug: 'remove-nth-node', difficulty: 'Medium', topic: 'Linked List', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/remove-nth-node-from-end-of-list/', tags: ['linked-list', 'two-pointers'] },
            ]
          },
          {
            title: 'Binary Tree',
            slug: 'binary-tree',
            order: 3,
            problems: [
              { title: 'Inorder Traversal', slug: 'inorder-traversal', difficulty: 'Easy', topic: 'Tree', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/binary-tree-inorder-traversal/', tags: ['tree', 'traversal'] },
              { title: 'Preorder Traversal', slug: 'preorder-traversal', difficulty: 'Easy', topic: 'Tree', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/binary-tree-preorder-traversal/', tags: ['tree', 'traversal'] },
              { title: 'Postorder Traversal', slug: 'postorder-traversal', difficulty: 'Easy', topic: 'Tree', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/binary-tree-postorder-traversal/', tags: ['tree', 'traversal'] },
              { title: 'Level Order Traversal', slug: 'level-order', difficulty: 'Medium', topic: 'Tree', platform: 'LeetCode', solveLink: 'https://leetcode.com/problems/binary-tree-level-order-traversal/', youtubeLink: 'https://www.youtube.com/watch?v=EoYfa6mYOG4', tags: ['tree', 'bfs'] },
            ]
          }
        ],
        userProgress: { 
          completedProblemSlugs: [], 
          revisionProblemSlugs: [], 
          notes: {} 
        }
      }
    };
    
    return fallbackSheets[slug] || null;
  };

  // Fetch sheet data
  useEffect(() => {
    const fetchSheet = async () => {
      setLoading(true);
      try {
        const response = await sheetsAPI.getBySlug(sheetId);
        const sheetData = response.data?.data || response.data;
        
        if (!sheetData) {
          throw new Error('No sheet data received');
        }
        
        setSheet(sheetData);
        
        // Expand all sections by default
        const initialExpanded = {};
        if (sheetData.sections) {
          sheetData.sections.forEach(section => {
            initialExpanded[section.slug] = true;
          });
          setExpandedSections(initialExpanded);
        }
      } catch (error) {
        console.error('Failed to fetch sheet from API, using fallback data:', error);
        
        // Use fallback data instead of redirecting
        const fallbackData = getFallbackSheet(sheetId);
        
        if (fallbackData) {
          setSheet(fallbackData);
          
          // Expand all sections by default
          const initialExpanded = {};
          if (fallbackData.sections) {
            fallbackData.sections.forEach(section => {
              initialExpanded[section.slug] = true;
            });
            setExpandedSections(initialExpanded);
          }
        } else {
          // Only redirect if no fallback exists for this sheet
          navigate('/dsa-sheets');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSheet();
  }, [sheetId, navigate]);

  // Command Palette keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowNotesModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Toggle problem completion
  const handleToggleComplete = async (problemSlug) => {
    // Check current state before toggling
    const isCurrentlyCompleted = sheet.userProgress?.completedProblemSlugs?.includes(problemSlug);
    
    try {
      await sheetsAPI.toggleProgress(sheetId, problemSlug);
      
      // Update local state only if API call succeeded
      setSheet(prevSheet => {
        const updatedSheet = { ...prevSheet };
        
        if (isCurrentlyCompleted) {
          updatedSheet.userProgress.completedProblemSlugs = 
            updatedSheet.userProgress.completedProblemSlugs.filter(slug => slug !== problemSlug);
        } else {
          if (!updatedSheet.userProgress) updatedSheet.userProgress = {};
          if (!updatedSheet.userProgress.completedProblemSlugs) updatedSheet.userProgress.completedProblemSlugs = [];
          updatedSheet.userProgress.completedProblemSlugs.push(problemSlug);
        }
        
        return updatedSheet;
      });
      
      showSuccess(isCurrentlyCompleted ? 'Problem unmarked' : 'Problem completed! 🎉');
    } catch (error) {
      console.error('Failed to toggle problem:', error);
      // If user is not authenticated, show a helpful message
      if (error.response?.status === 401) {
        showError('Please sign in to track your progress');
      }
      // Otherwise silently handle error
    }
  };

  // Toggle revision
  const handleToggleRevision = async (problemSlug) => {
    // Check current state before toggling
    const isCurrentlyRevision = sheet.userProgress?.revisionProblemSlugs?.includes(problemSlug);
    
    try {
      await sheetsAPI.toggleRevision(sheetId, problemSlug);
      
      // Update local state only if API call succeeded
      setSheet(prevSheet => {
        const updatedSheet = { ...prevSheet };
        
        if (isCurrentlyRevision) {
          updatedSheet.userProgress.revisionProblemSlugs = 
            updatedSheet.userProgress.revisionProblemSlugs.filter(slug => slug !== problemSlug);
        } else {
          if (!updatedSheet.userProgress) updatedSheet.userProgress = {};
          if (!updatedSheet.userProgress.revisionProblemSlugs) updatedSheet.userProgress.revisionProblemSlugs = [];
          updatedSheet.userProgress.revisionProblemSlugs.push(problemSlug);
        }
        
        return updatedSheet;
      });
      
      showSuccess(isCurrentlyRevision ? 'Removed from revision' : 'Added to revision list');
    } catch (error) {
      console.error('Failed to toggle revision:', error);
      // If user is not authenticated, show a helpful message
      if (error.response?.status === 401) {
        showError('Please sign in to track your progress');
      }
      // Otherwise silently handle error
    }
  };

  // Save notes
  const handleSaveNotes = async () => {
    if (!selectedProblem) return;
    
    try {
      await sheetsAPI.saveNotes(sheetId, selectedProblem.slug, noteContent);
      
      // Update local state only if API call succeeded
      setSheet(prevSheet => {
        const updatedSheet = { ...prevSheet };
        if (!updatedSheet.userProgress) updatedSheet.userProgress = {};
        if (!updatedSheet.userProgress.notes) updatedSheet.userProgress.notes = {};
        updatedSheet.userProgress.notes[selectedProblem.slug] = noteContent;
        return updatedSheet;
      });
      
      showSuccess('Notes saved successfully');
      setShowNotesModal(false);
    } catch (error) {
      console.error('Failed to save notes:', error);
      // If user is not authenticated, show a helpful message
      if (error.response?.status === 401) {
        showError('Please sign in to save notes');
      }
      // Otherwise silently handle error
    }
  };

  // Open notes modal
  const handleOpenNotes = (problem) => {
    setSelectedProblem(problem);
    setNoteContent(sheet.userProgress?.notes?.[problem.slug] || '');
    setShowNotesModal(true);
  };

  // Get random problem
  const handleRandomProblem = async () => {
    try {
      const response = await sheetsAPI.getRandom(sheetId);
      const randomProblem = response.data;
      
      // Scroll to problem
      const problemElement = document.getElementById(`problem-${randomProblem.slug}`);
      if (problemElement) {
        problemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        problemElement.classList.add('bg-yellow-100', 'dark:bg-yellow-900/20');
        setTimeout(() => {
          problemElement.classList.remove('bg-yellow-100', 'dark:bg-yellow-900/20');
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to get random problem:', error);
      // Silently handle error, don't show to user
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!sheet) return null;

    const completedSlugs = sheet.userProgress?.completedProblemSlugs || [];
    const allProblems = sheet.sections.flatMap(s => s.problems);
    
    const completed = completedSlugs.length;
    const total = allProblems.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const easy = allProblems.filter(p => p.difficulty === 'Easy').length;
    const medium = allProblems.filter(p => p.difficulty === 'Medium').length;
    const hard = allProblems.filter(p => p.difficulty === 'Hard').length;
    
    const easyCompleted = allProblems.filter(p => 
      p.difficulty === 'Easy' && completedSlugs.includes(p.slug)
    ).length;
    const mediumCompleted = allProblems.filter(p => 
      p.difficulty === 'Medium' && completedSlugs.includes(p.slug)
    ).length;
    const hardCompleted = allProblems.filter(p => 
      p.difficulty === 'Hard' && completedSlugs.includes(p.slug)
    ).length;

    return {
      completed,
      total,
      percentage,
      easy,
      medium,
      hard,
      easyCompleted,
      mediumCompleted,
      hardCompleted
    };
  }, [sheet]);

  // Filter problems
  const filteredProblems = useMemo(() => {
    if (!sheet) return [];

    let problems = sheet.sections.flatMap(s => 
      s.problems.map(p => ({ ...p, sectionTitle: s.title, sectionSlug: s.slug }))
    );

    // Search filter
    if (searchQuery) {
      problems = problems.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Difficulty filter
    if (difficultyFilter !== 'all') {
      problems = problems.filter(p => p.difficulty === difficultyFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      const completedSlugs = sheet.userProgress?.completedProblemSlugs || [];
      if (statusFilter === 'completed') {
        problems = problems.filter(p => completedSlugs.includes(p.slug));
      } else if (statusFilter === 'todo') {
        problems = problems.filter(p => !completedSlugs.includes(p.slug));
      }
    }

    return problems;
  }, [sheet, searchQuery, difficultyFilter, statusFilter]);

  // Toggle section
  const toggleSection = (sectionSlug) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionSlug]: !prev[sectionSlug]
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-royal-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading sheet...</p>
        </div>
      </div>
    );
  }

  if (!sheet) {
    // Silently redirect if sheet is not found
    navigate('/dsa-sheets');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate('/dsa-sheets')}
            className="text-royal-600 dark:text-royal-400 hover:underline mb-4 flex items-center gap-2"
          >
            ← Back to DSA Sheets
          </button>
          
          <div className="bg-white dark:bg-surface-800 rounded-2xl p-8 shadow-soft-xl">
            <h1 className="text-4xl font-bold text-navy-900 dark:text-white mb-3">
              {sheet.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {sheet.description}
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleRandomProblem}
                className="flex items-center gap-2 px-4 py-2 bg-royal-600 text-white rounded-lg hover:bg-royal-700 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Random Problem
              </button>
              
              <button
                onClick={() => setShowCommandPalette(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-surface-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-surface-600 transition-colors"
              >
                <Command className="w-4 h-4" />
                Command Palette
                <kbd className="ml-2 px-2 py-1 text-xs bg-white dark:bg-surface-800 rounded border border-gray-300 dark:border-gray-600">
                  Ctrl+K
                </kbd>
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-surface-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-surface-600 transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gradient-to-br from-royal-50 to-royal-100 dark:from-royal-900/20 dark:to-royal-800/20 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-royal-600 dark:text-royal-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Progress</p>
                </div>
                <p className="text-2xl font-bold text-royal-600 dark:text-royal-400">
                  {stats.percentage}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {stats.completed}/{stats.total} solved
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Easy</p>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.easyCompleted}/{stats.easy}
                </p>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Medium</p>
                </div>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">
                  {stats.mediumCompleted}/{stats.medium}
                </p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Hard</p>
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.hardCompleted}/{stats.hard}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Revision</p>
                </div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {sheet.userProgress?.revisionProblemSlugs?.length || 0}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 bg-white dark:bg-surface-800 rounded-xl p-6 shadow-soft-md"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Search Problems
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by title or tags..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-royal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Difficulty
                  </label>
                  <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-royal-500"
                  >
                    <option value="all">All Difficulties</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-royal-500"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="todo">To Do</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Problems List */}
        <div className="space-y-6">
          {sheet.sections.map((section, sectionIndex) => {
            const sectionProblems = section.problems;
            const completedInSection = sectionProblems.filter(p => 
              sheet.userProgress?.completedProblemSlugs?.includes(p.slug)
            ).length;
            const sectionProgress = Math.round((completedInSection / sectionProblems.length) * 100);

            // Filter section problems
            const visibleProblems = searchQuery || difficultyFilter !== 'all' || statusFilter !== 'all'
              ? sectionProblems.filter(p => filteredProblems.some(fp => fp.slug === p.slug))
              : sectionProblems;

            if (visibleProblems.length === 0) return null;

            return (
              <motion.div
                key={section.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sectionIndex * 0.05 }}
                className="bg-white dark:bg-surface-800 rounded-xl shadow-soft-md overflow-hidden"
              >
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.slug)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {expandedSections[section.slug] ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                      <Hash className="w-5 h-5 text-royal-600 dark:text-royal-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-navy-900 dark:text-white">
                        {sectionIndex + 1}. {section.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {completedInSection}/{sectionProblems.length} completed • {sectionProgress}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="w-32 bg-gray-200 dark:bg-surface-600 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-royal-500 to-royal-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${sectionProgress}%` }}
                    />
                  </div>
                </button>

                {/* Section Problems */}
                <AnimatePresence>
                  {expandedSections[section.slug] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-gray-200 dark:border-gray-700"
                    >
                      {visibleProblems.map((problem, problemIndex) => {
                        const isCompleted = sheet.userProgress?.completedProblemSlugs?.includes(problem.slug);
                        const isRevision = sheet.userProgress?.revisionProblemSlugs?.includes(problem.slug);
                        const hasNotes = sheet.userProgress?.notes?.[problem.slug];

                        return (
                          <div
                            key={problem.slug}
                            id={`problem-${problem.slug}`}
                            className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-surface-700/50 transition-all duration-200"
                          >
                            <div className="flex items-start gap-4">
                              {/* Checkbox */}
                              <button
                                onClick={() => handleToggleComplete(problem.slug)}
                                className="mt-1 flex-shrink-0"
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                                ) : (
                                  <Circle className="w-6 h-6 text-gray-300 dark:text-gray-600 hover:text-royal-500" />
                                )}
                              </button>

                              {/* Problem Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                  <h4 className={`text-base font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                                    {problemIndex + 1}. {problem.title}
                                  </h4>
                                  
                                  <span className={`px-2 py-1 text-xs font-medium rounded-md flex-shrink-0 ${
                                    problem.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                    problem.difficulty === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                  }`}>
                                    {problem.difficulty}
                                  </span>
                                </div>

                                {/* Tags */}
                                {problem.tags && problem.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {problem.tags.map((tag, i) => (
                                      <span
                                        key={i}
                                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-surface-600 text-gray-600 dark:text-gray-400 rounded-md"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Action Links */}
                                <div className="flex flex-wrap items-center gap-3">
                                  {problem.solveLink && (
                                    <a
                                      href={problem.solveLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-sm text-royal-600 dark:text-royal-400 hover:underline"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                      Solve
                                    </a>
                                  )}
                                  
                                  {problem.youtubeLink && (
                                    <a
                                      href={problem.youtubeLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline"
                                    >
                                      <Youtube className="w-4 h-4" />
                                      Video
                                    </a>
                                  )}
                                  
                                  {problem.editorialLink && (
                                    <a
                                      href={problem.editorialLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                      <BookOpen className="w-4 h-4" />
                                      Editorial
                                    </a>
                                  )}

                                  <button
                                    onClick={() => handleOpenNotes(problem)}
                                    className={`flex items-center gap-1 text-sm ${hasNotes ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'} hover:underline`}
                                  >
                                    <StickyNote className="w-4 h-4" />
                                    {hasNotes ? 'Edit Notes' : 'Add Notes'}
                                  </button>

                                  <button
                                    onClick={() => handleToggleRevision(problem.slug)}
                                    className={`flex items-center gap-1 text-sm ${isRevision ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'} hover:underline`}
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                    {isRevision ? 'In Revision' : 'Mark for Revision'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredProblems.length === 0 && (searchQuery || difficultyFilter !== 'all' || statusFilter !== 'all') && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No problems match your filters</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setDifficultyFilter('all');
                setStatusFilter('all');
              }}
              className="mt-4 text-royal-600 dark:text-royal-400 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Command Palette Modal */}
        <AnimatePresence>
          {showCommandPalette && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-32 px-4"
              onClick={() => setShowCommandPalette(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[60vh] overflow-hidden"
              >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search problems..."
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-surface-700 border-0 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-royal-500"
                      autoFocus
                    />
                  </div>
                </div>
                
                <div className="overflow-y-auto max-h-[calc(60vh-80px)] p-2">
                  {filteredProblems.slice(0, 10).map((problem, i) => {
                    const isCompleted = sheet.userProgress?.completedProblemSlugs?.includes(problem.slug);
                    
                    return (
                      <button
                        key={problem.slug}
                        onClick={() => {
                          const element = document.getElementById(`problem-${problem.slug}`);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            setShowCommandPalette(false);
                          }
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-surface-700 rounded-lg transition-colors text-left"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {problem.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {problem.sectionTitle}
                          </p>
                        </div>
                        
                        <span className={`px-2 py-1 text-xs rounded-md flex-shrink-0 ${
                          problem.difficulty === 'Easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          problem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {problem.difficulty}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notes Modal */}
        <AnimatePresence>
          {showNotesModal && selectedProblem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4"
              onClick={() => setShowNotesModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Notes
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {selectedProblem.title}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNotesModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-surface-700 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Write your notes here... (Markdown supported)"
                    className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-royal-500 resize-none"
                  />
                </div>
                
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                  <button
                    onClick={handleSaveNotes}
                    className="flex-1 py-3 bg-royal-600 text-white rounded-lg hover:bg-royal-700 font-medium transition-colors"
                  >
                    Save Notes
                  </button>
                  <button
                    onClick={() => setShowNotesModal(false)}
                    className="px-6 py-3 bg-gray-100 dark:bg-surface-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-surface-600 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SheetDetail;

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { validateGenerationPayload, estimateFeasibility } from '../../services/roadmapApi';

// Mock role suggestions (can be fetched from backend)
const ROLE_SUGGESTIONS = [
  'Software Engineer',
  'Data Scientist',
  'Full Stack Developer',
  'Machine Learning Engineer',
  'DevOps Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Product Manager',
  'UI/UX Designer',
  'System Architect',
];

const EXPERIENCE_LEVELS = [
  { value: 'novice', label: 'Novice', description: 'Just starting out' },
  { value: 'intermediate', label: 'Intermediate', description: 'Some experience' },
  { value: 'advanced', label: 'Advanced', description: 'Significant experience' },
];

const COMMON_FOCUS_AREAS = [
  'Algorithms',
  'System Design',
  'Frontend',
  'Backend',
  'Database',
  'DevOps',
  'ML',
  'NLP',
  'Computer Vision',
  'Cloud',
  'Security',
  'Testing',
];

const RoadmapGenerator = ({ userId, onGenerate, isGenerating }) => {
  const [formData, setFormData] = useState({
    role: '',
    jdText: '',
    jdFile: null,
    targetDate: '',
    weeklyHours: 10,
    experience: 'intermediate',
    focusAreas: [],
    currentSkills: '', // Added for current skills input
  });
  
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const [filteredRoles, setFilteredRoles] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [feasibility, setFeasibility] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const roleInputRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Filter role suggestions based on input
  useEffect(() => {
    if (formData.role) {
      const filtered = ROLE_SUGGESTIONS.filter(role =>
        role.toLowerCase().includes(formData.role.toLowerCase())
      );
      setFilteredRoles(filtered);
    } else {
      setFilteredRoles(ROLE_SUGGESTIONS);
    }
  }, [formData.role]);
  
  // Calculate feasibility when relevant fields change
  useEffect(() => {
    if (formData.targetDate && formData.weeklyHours > 0) {
      const payload = buildPayload();
      const feasibilityResult = estimateFeasibility(payload);
      setFeasibility(feasibilityResult);
    } else {
      setFeasibility(null);
    }
  }, [formData.targetDate, formData.weeklyHours, formData.experience, formData.focusAreas]);
  
  // Load draft from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem('roadmap_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, []);
  
  // Save draft to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('roadmap_draft', JSON.stringify(formData));
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [formData]);
  
  const buildPayload = () => {
    // Parse current skills from comma-separated string
    const skillsArray = formData.currentSkills
      ? formData.currentSkills.split(',').map(s => s.trim()).filter(s => s)
      : [];

    return {
      userId,
      goal: formData.role, // Learning goal/target role
      currentLevel: formData.experience, // User's current level
      targetRole: formData.role, // Target role
      timeframe: calculateTimeframe(formData.targetDate), // Calculate from target date
      skills: skillsArray, // User's current skills
      preferredTopics: formData.focusAreas, // User's focus areas as preferred topics
      jobDescription: formData.jdText, // Job description text
      // Legacy fields for backward compatibility
      jdText: formData.jdText,
      targetDate: formData.targetDate,
      weeklyHours: formData.weeklyHours,
      experience: formData.experience,
      focusAreas: formData.focusAreas,
    };
  };

  const calculateTimeframe = (targetDate) => {
    if (!targetDate) return { value: 12, unit: 'weeks' };
    
    const target = new Date(targetDate);
    const now = new Date();
    const diffTime = Math.abs(target - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.ceil(diffDays / 7);
    const diffMonths = Math.ceil(diffDays / 30);
    
    if (diffWeeks <= 8) {
      return { value: diffWeeks, unit: 'weeks' };
    } else if (diffMonths <= 6) {
      return { value: diffMonths, unit: 'months' };
    } else {
      return { value: diffMonths, unit: 'months' };
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const payload = buildPayload();
    const validation = validateGenerationPayload(payload);
    
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }
    
    setValidationErrors([]);
    onGenerate(payload);
    
    // Clear draft after successful submission
    localStorage.removeItem('roadmap_draft');
  };
  
  const handleRoleSelect = (role) => {
    setFormData(prev => ({ ...prev, role }));
    setShowRoleSuggestions(false);
  };
  
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ 
          ...prev, 
          jdText: event.target.result,
          jdFile: file.name 
        }));
      };
      reader.readAsText(file);
    }
  };
  
  const toggleFocusArea = (area) => {
    setFormData(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter(a => a !== area)
        : [...prev.focusAreas, area],
    }));
  };
  
  const addCustomFocusArea = (area) => {
    if (area && !formData.focusAreas.includes(area)) {
      setFormData(prev => ({
        ...prev,
        focusAreas: [...prev.focusAreas, area],
      }));
    }
  };
  
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
    >
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Generate Your Personalized Roadmap
      </h2>
      
      {/* Validation Errors */}
      <AnimatePresence>
        {validationErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">
              Please fix the following errors:
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, idx) => (
                <li key={idx} className="text-red-700 dark:text-red-300 text-sm">
                  {error}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role Input with Autocomplete */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Role *
          </label>
          <input
            ref={roleInputRef}
            type="text"
            value={formData.role}
            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
            onFocus={() => setShowRoleSuggestions(true)}
            onBlur={() => setTimeout(() => setShowRoleSuggestions(false), 200)}
            placeholder="e.g., Data Scientist"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          
          {/* Role Suggestions Dropdown */}
          {showRoleSuggestions && filteredRoles.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 
                          dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredRoles.map((role, idx) => (
                <button
                  key={idx}
                  type="button"
                  onMouseDown={() => handleRoleSelect(role)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600
                           text-gray-900 dark:text-white"
                >
                  {role}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Current Skills Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your Current Skills
          </label>
          <input
            type="text"
            value={formData.currentSkills}
            onChange={(e) => setFormData(prev => ({ ...prev, currentSkills: e.target.value }))}
            placeholder="e.g., JavaScript, React, Java, Python (comma-separated)"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            List your current technical skills, separated by commas. This helps AI create a personalized roadmap.
          </p>
        </div>
        
        {/* JD Upload/Paste - Enhanced */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
          <label className="block text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Job Description (Highly Recommended for Best Results!)
          </label>
          <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
            💡 Adding a job description helps AI align your learning path with specific role requirements!
          </p>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600
                         text-gray-700 dark:text-gray-300 rounded-lg transition-colors border border-blue-300 dark:border-blue-600
                         flex items-center justify-center gap-2 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {formData.jdFile ? `✓ ${formData.jdFile}` : 'Upload JD'}
              </button>
              {formData.jdFile && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, jdFile: null, jdText: '' }))}
                  className="px-3 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50
                           text-red-600 dark:text-red-400 rounded-lg transition-colors text-sm"
                  title="Clear file"
                >
                  ✕
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <div className="relative">
              <textarea
                value={formData.jdText}
                onChange={(e) => setFormData(prev => ({ ...prev, jdText: e.target.value }))}
                placeholder="Or paste the complete job description here...

Example:
• Required Skills: Python, React, Node.js
• Experience: 2+ years in full-stack development
• Responsibilities: Build scalable web applications
• Nice to have: AWS, Docker, Kubernetes

The more detailed, the better the roadmap! 🎯"
                rows={6}
                className="w-full px-4 py-3 border-2 border-blue-200 dark:border-blue-700 rounded-lg 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         placeholder-gray-400 dark:placeholder-gray-500 text-sm"
              />
              {formData.jdText && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 
                              text-green-700 dark:text-green-400 text-xs rounded-full font-medium">
                  {formData.jdText.length} chars
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Target Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Date *
          </label>
          <input
            type="date"
            value={formData.targetDate}
            onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
            min={getMinDate()}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        
        {/* Weekly Hours Slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Weekly Study Hours: {formData.weeklyHours}h
          </label>
          <input
            type="range"
            min="1"
            max="40"
            value={formData.weeklyHours}
            onChange={(e) => setFormData(prev => ({ ...prev, weeklyHours: parseInt(e.target.value) }))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer
                     accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>1h</span>
            <span>20h</span>
            <span>40h</span>
          </div>
        </div>
        
        {/* Experience Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Experience Level *
          </label>
          <div className="grid grid-cols-3 gap-4">
            {EXPERIENCE_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, experience: level.value }))}
                className={`p-4 border-2 rounded-lg transition-all ${
                  formData.experience === level.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold text-gray-900 dark:text-white">{level.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{level.description}</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Focus Areas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Focus Areas (Select at least one)
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {COMMON_FOCUS_AREAS.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => toggleFocusArea(area)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  formData.focusAreas.includes(area)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
          
          {/* Custom Focus Area */}
          <input
            type="text"
            placeholder="Add custom focus area (press Enter)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomFocusArea(e.target.value);
                e.target.value = '';
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
        
        {/* Feasibility Preview */}
        {feasibility && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-4 rounded-lg border ${
              feasibility.score >= 70
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : feasibility.score >= 50
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Feasibility Estimate
              </span>
              <span className={`text-2xl font-bold ${
                feasibility.score >= 70 ? 'text-green-600' :
                feasibility.score >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {feasibility.score}%
              </span>
            </div>
            {feasibility.reasons.length > 0 && (
              <ul className="space-y-1">
                {feasibility.reasons.map((reason, idx) => (
                  <li key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                    • {reason}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                   text-white font-semibold rounded-lg transition-colors
                   flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating Roadmap...
            </>
          ) : (
            'Generate Roadmap'
          )}
        </button>
      </form>
    </motion.div>
  );
};

export default RoadmapGenerator;

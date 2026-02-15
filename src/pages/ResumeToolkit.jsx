import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
  Save, 
  Play, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Sparkles, 
  FileText,
  Target,
  Mail,
  MessageSquare,
  Shield,
  Zap,
  Download
} from 'lucide-react';
import { io } from 'socket.io-client';
import apiClient from '../config/axios';
import { showSuccess, showError, showApiError, showPromise } from '../utils/toast';
import { useTracking } from '../contexts/TrackingContext';

import ResumeUploader from '../components/resume/ResumeUploader';
import JDInput from '../components/resume/JDInput';
import AnalysisControls from '../components/resume/AnalysisControls';
import ResultsTabs from '../components/resume/ResultsTabs';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuthStore } from '../store/authStore';

gsap.registerPlugin(ScrollTrigger);

/**
 * Resume Toolkit Page - Resume Genome
 * Privacy-first: Results are transient by default, saved only with explicit consent
 */

const DRAFT_STORAGE_KEY = 'resumeToolkit_draft';

const INSTRUCTIONS = `
Instructions:
• Upload your resume (PDF or DOCX) using the file upload area
• If you want to analyze your resume against a specific job description:
  - Keep the checkbox checked and either paste the job description or enter a job URL and click Auto-Fill
• If you just want a general resume analysis, uncheck the "Analyze with Job Description" box
• Adjust the settings for creativity and response length
• Click "Analyze Resume" to get your results
• After analyzing, you can download a detailed PDF report of your analysis
`;

const PRIVACY_NOTICE = `
Privacy Notice: Your resume analysis is transient by default and not saved unless you explicitly consent. 
All data is automatically deleted once the session ends. Check the box below to save results to your account.
`;

const DISCLAIMER = `
Disclaimer: This analysis is AI-generated based on the provided job description and resume. 
It should be carefully reviewed and tailored to your specific needs before use. 
If your resume uses complex formatting (tables, columns, custom fonts), some content may not parse correctly.
`;

export default function ResumeToolkit() {
  const { user } = useAuthStore();
  const { trackPageView, track } = useTracking();
  const socketRef = useRef(null);
  const containerRef = useRef(null);
  const heroRef = useRef(null);

  // Track page view
  useEffect(() => {
    trackPageView('/resume-toolkit');
  }, [trackPageView]);

  // Form State
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);

  // Results State
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Save State
  const [saveConsent, setSaveConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  // GSAP Animations on mount
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-content', {
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      });

      gsap.from('.feature-badge', {
        scale: 0,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: 'back.out(1.7)',
        delay: 0.3,
      });

      gsap.from('.main-card', {
        y: 80,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out',
        delay: 0.5,
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.jobDescription) setJobDescription(parsed.jobDescription);
        if (parsed.temperature !== undefined) setTemperature(parsed.temperature);
        if (parsed.maxTokens !== undefined) setMaxTokens(parsed.maxTokens);
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, []);

  // Save draft to localStorage
  useEffect(() => {
    const draft = {
      jobDescription,
      temperature,
      maxTokens,
      timestamp: Date.now(),
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [jobDescription, temperature, maxTokens]);

  // Setup Socket.IO listener
  useEffect(() => {
    if (!user) return;

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO connected');
    });

    socket.on('resume:processed', (data) => {
      if (data.userId === user.uid) {
        showSuccess('Resume analysis saved successfully');
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const handleFileSelect = async (file) => {
    console.log('📁 File selected:', file);
    setResumeFile(file);
    if (!file) {
      setResumeText('');
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting resume processing...');
      
      // Create FormData and upload to backend
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/resume-genome/process-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const parsed = response.data.data;
      console.log('✅ Resume processed successfully, text length:', parsed?.length);
      
      setResumeText(parsed);
      setResults({ parsedResume: parsed, resumeText: parsed });
      showSuccess('Resume processed successfully! 📄');
    } catch (err) {
      console.error('❌ Resume processing error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to process resume';
      setError(errorMessage);
      showApiError(err, 'Failed to process resume');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText) {
      showError('Please upload a resume first');
      return;
    }

    console.log('🔍 Starting analysis...');
    setLoading(true);
    setError(null);

    try {
      console.log('1️⃣ Running resume analysis...');
      
      // Run analysis
      const analysisResponse = await apiClient.post('/resume-genome/analyze', {
        resumeText,
        jobDescription: jobDescription.trim() || undefined,
        withJobDescription: !!jobDescription.trim(),
        temperature,
        maxTokens,
      });
      const analysisResult = analysisResponse.data.data;
      console.log('✅ Analysis complete');

      // Generate rephrased bullets
      console.log('2️⃣ Generating rephrased text...');
      let rephrasedBullets = [];
      if (resumeText) {
        try {
          const rephraseResponse = await apiClient.post('/resume-genome/rephrase', {
            text: resumeText.substring(0, 2000), // Limit text length
            temperature,
            maxTokens,
          });
          const rephrased = rephraseResponse.data.data;
          rephrasedBullets = Array.isArray(rephrased) ? rephrased : (typeof rephrased === 'string' ? rephrased.split('\n').filter(b => b.trim()) : [rephrased]);
          console.log('✅ Rephrase complete:', rephrasedBullets.length, 'bullets');
        } catch (err) {
          console.error('⚠️ Rephrase error:', err);
          // Don't fail the whole analysis if rephrase fails
          rephrasedBullets = [];
        }
      }

      // Generate cover letter if JD provided
      console.log('3️⃣ Generating cover letter...');
      let coverLetterText = null;
      if (jobDescription.trim()) {
        try {
          const coverResponse = await apiClient.post('/resume-genome/cover-letter', {
            resumeText,
            jobDescription,
            temperature,
            maxTokens: 2000,
          });
          coverLetterText = coverResponse.data.data;
          console.log('✅ Cover letter complete');
        } catch (err) {
          console.error('⚠️ Cover letter error:', err);
          // Don't fail if cover letter fails
          coverLetterText = null;
        }
      }

      // Generate interview questions if JD provided
      console.log('4️⃣ Generating interview questions...');
      let interviewQs = [];
      if (jobDescription.trim()) {
        try {
          const questionsResponse = await apiClient.post('/resume-genome/interview-questions', {
            resumeText,
            jobDescription,
            temperature,
            maxTokens: 1500,
          });
          const questions = questionsResponse.data.data;
          interviewQs = Array.isArray(questions) ? questions : [questions];
          console.log('✅ Interview questions complete');
        } catch (err) {
          console.error('⚠️ Interview questions error:', err);
          // Don't fail if questions fail
          interviewQs = [];
        }
      }

      console.log('✅ All analysis complete!');
      
      // Extract metadata from analysis response
      const analysisMetadata = analysisResponse.data.metadata || {};
      const analysisData = analysisResponse.data.data;
      
      // Check if this is a skill gap analysis response (when JD is provided)
      let skillGapData = null;
      let analysisText = null;
      
      if (analysisData && typeof analysisData === 'object' && analysisData.type === 'skillGapAnalysis') {
        // This is a skill gap analysis response
        skillGapData = analysisData.skillGap;
        analysisText = '**\u2705 Skill Gap Analysis Generated**\n\nPlease check the "Skill Gap" tab to view the detailed analysis of your resume against the job description.';
      } else if (typeof analysisData === 'string') {
        // This is a regular text analysis
        analysisText = analysisData;
      } else if (analysisData && analysisData.analysis) {
        // Analysis wrapped in object
        analysisText = analysisData.analysis;
      } else {
        // Fallback
        analysisText = analysisData;
      }
      
      const resultData = {
        parsedResume: resumeText,
        resumeText,
        jobDescription,
        analysis: analysisText,
        skillGapAnalysis: skillGapData,
        rephrased: rephrasedBullets,
        coverLetter: coverLetterText,
        interviewQuestions: interviewQs,
        metadata: analysisMetadata,
      };
      
      setResults(resultData);
      
      // Track resume analysis with provider metadata
      track('resume_analyzed', {
        hasJobDescription: !!jobDescription.trim(),
        resumeLength: resumeText.length,
        generatedBullets: rephrasedBullets.length,
        hasCoverLetter: !!coverLetterText,
        hasInterviewQuestions: interviewQs.length > 0,
        provider: analysisMetadata?.provider || 'unknown',
        degradedMode: analysisMetadata?.degradedMode || false,
        cached: analysisMetadata?.cached || false
      });

      // Check if we're in degraded mode and show appropriate message
      if (analysisMetadata?.degradedMode) {
        showWarning('⚠️ Analysis completed using rule-based fallback. AI services are temporarily limited. Results may be less detailed than usual.', { duration: 8000 });
      } else if (analysisMetadata?.cached) {
        showSuccess(`Analysis completed successfully! 🎉 (via ${analysisMetadata.provider}, cached)`);
      } else {
        showSuccess(`Analysis completed successfully! 🎉 (via ${analysisMetadata.provider})`);
      }
    } catch (err) {
      console.error('❌ Analysis error:', err);
      
      // Handle specific error codes from backend
      const errorData = err.response?.data;
      const errorCode = errorData?.code;
      
      let errorMessage = 'Analysis failed. Please try again.';
      
      if (errorCode === 'QUOTA_EXCEEDED') {
        errorMessage = '⚠️ AI service quota exceeded. Trying alternative providers...';
        showError(errorMessage, { duration: 6000 });
      } else if (errorCode === 'CONFIG_ERROR') {
        errorMessage = '⚠️ AI service configuration issue. Please contact support.';
        showError(errorMessage, { duration: 6000 });
      } else if (errorCode === 'CONNECTION_ERROR') {
        errorMessage = '⚠️ AI service is currently unavailable. Please try again in a few minutes.';
        showError(errorMessage, { duration: 6000 });
      } else {
        errorMessage = errorData?.message || err.message || errorMessage;
        showApiError(err, errorMessage);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!saveConsent) {
      showError('Please consent to saving your data');
      return;
    }

    if (!results) {
      showError('No results to save');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        resumeText: results.resumeText,
        jobDescription: results.jobDescription,
        analysis: results.analysis,
        rephrased: results.rephrased,
        coverLetter: results.coverLetter,
        interviewQuestions: results.interviewQuestions,
      };

      await apiClient.post('/resume-genome/save', payload);

      showSuccess('Analysis saved to database');
      setSaveConsent(false); // Reset consent after save
    } catch (err) {
      console.error('Save error:', err);
      showApiError(err, 'Failed to save analysis');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-[#0c0c1d] via-[#111133] to-[#1a0b2e] relative overflow-hidden pt-24">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-royal-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-navy-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-7xl">
        {/* Hero Section */}
        <motion.div
          ref={heroRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 hero-content"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-royal-400 animate-pulse" />
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-royal-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Resume Genome
            </h1>
            <Zap className="w-10 h-10 text-purple-400 animate-pulse" />
          </div>
          
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            AI-powered resume analysis, cover letter generation, and interview preparation toolkit
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <div className="feature-badge flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm border border-royal-500/30 rounded-full">
              <FileText className="w-4 h-4 text-royal-400" />
              <span className="text-sm text-gray-300">Smart Parsing</span>
            </div>
            <div className="feature-badge flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm border border-purple-500/30 rounded-full">
              <Target className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-300">Job Matching</span>
            </div>
            <div className="feature-badge flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm border border-pink-500/30 rounded-full">
              <Mail className="w-4 h-4 text-pink-400" />
              <span className="text-sm text-gray-300">Cover Letters</span>
            </div>
            <div className="feature-badge flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm border border-blue-500/30 rounded-full">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">Interview Prep</span>
            </div>
            <div className="feature-badge flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm border border-green-500/30 rounded-full">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">Privacy First</span>
            </div>
          </div>

          {/* Privacy Notice */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="max-w-3xl mx-auto mb-8"
          >
            <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl backdrop-blur-sm">
              <Shield className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm text-yellow-200 font-medium mb-1">Privacy Notice</p>
                <p className="text-sm text-yellow-100/80">
                  Your resume analysis is transient by default and not saved unless you explicitly consent. 
                  All data is automatically deleted once the session ends.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input & Controls */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="main-card space-y-6"
          >
            {/* Upload Card */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-royal-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Upload Resume</h2>
                  <p className="text-sm text-gray-400">PDF or DOCX, up to 10MB</p>
                </div>
              </div>
              
              <ResumeUploader
                onFileSelect={handleFileSelect}
                disabled={loading}
                currentFile={resumeFile}
              />
            </div>

            {/* Job Description Card */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Job Description</h2>
                  <p className="text-sm text-gray-400">Paste text or auto-fill from URL</p>
                </div>
              </div>
              
              <JDInput
                value={jobDescription}
                onChange={setJobDescription}
                disabled={loading}
              />
            </div>

            {/* Settings Card */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">AI Settings</h2>
                  <p className="text-sm text-gray-400">Customize analysis parameters</p>
                </div>
              </div>
              
              <AnalysisControls
                temperature={temperature}
                maxTokens={maxTokens}
                onTemperatureChange={setTemperature}
                onMaxTokensChange={setMaxTokens}
                disabled={loading}
              />
            </div>

            {/* Action Button */}
            <motion.button
              onClick={handleAnalyze}
              disabled={!resumeText || loading}
              whileHover={!resumeText && !loading ? {} : { scale: 1.02 }}
              whileTap={!resumeText && !loading ? {} : { scale: 0.98 }}
              className={`w-full px-8 py-4 rounded-xl font-bold text-lg shadow-2xl transition-all duration-300 ${
                !resumeText || loading
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-royal-600 via-purple-600 to-pink-600 text-white hover:shadow-royal-500/50'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Analyzing with AI...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  <Play className="w-6 h-6" />
                  <span>Analyze Resume</span>
                </span>
              )}
            </motion.button>

            {/* Save Section */}
            <AnimatePresence>
              {results && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6 backdrop-blur-sm"
                >
                  <label className="flex items-start gap-3 cursor-pointer group mb-4">
                    <input
                      type="checkbox"
                      checked={saveConsent}
                      onChange={(e) => setSaveConsent(e.target.checked)}
                      className="mt-1 w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-200 group-hover:text-white transition-colors">
                      I consent to saving this analysis to my account. This will store my resume text, 
                      job description, and analysis results in the database.
                    </span>
                  </label>
                  <motion.button
                    onClick={handleSave}
                    disabled={!saveConsent || saving}
                    whileHover={saveConsent && !saving ? { scale: 1.02 } : {}}
                    whileTap={saveConsent && !saving ? { scale: 0.98 } : {}}
                    className={`w-full px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                      !saveConsent || saving
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/50'
                    }`}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Save to Account</span>
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right Column - Results */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="main-card lg:sticky lg:top-8 lg:self-start"
          >
            <ResultsTabs results={results} loading={loading} error={error} />
          </motion.div>
        </div>

        {/* Info Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full">
            <Info className="w-4 h-4 text-royal-400" />
            <p className="text-sm text-gray-300">
              Powered by OpenAI GPT-4 • All data processed securely
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

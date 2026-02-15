import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Eye,
  Send,
} from 'lucide-react';
import { gsap } from 'gsap';
import { showSuccess, showError, showInfo, showLoading } from '../utils/toast';
import { useNavigate, useParams } from 'react-router-dom';

const AsyncInterview = () => {
  const navigate = useNavigate();
  const { interviewId } = useParams();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedTime, setRecordedTime] = useState(0);
  const [videoBlobs, setVideoBlobs] = useState([]);
  const [deviceReady, setDeviceReady] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Interview questions
  const questions = [
    {
      id: 1,
      text: 'Tell me about yourself and why you\'re interested in this role.',
      timeLimit: 120, // 2 minutes
      type: 'behavioral',
    },
    {
      id: 2,
      text: 'Describe a challenging technical problem you solved and your approach.',
      timeLimit: 180, // 3 minutes
      type: 'technical',
    },
    {
      id: 3,
      text: 'What are your greatest strengths as a software engineer?',
      timeLimit: 120,
      type: 'behavioral',
    },
    {
      id: 4,
      text: 'How do you stay updated with the latest technologies and best practices?',
      timeLimit: 120,
      type: 'behavioral',
    },
    {
      id: 5,
      text: 'Where do you see yourself in 5 years?',
      timeLimit: 120,
      type: 'behavioral',
    },
  ];

  useEffect(() => {
    initializeCamera();
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordedTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= questions[currentQuestion].timeLimit) {
            stopRecording();
            return prev;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused, currentQuestion]);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setDeviceReady(true);
      showSuccess('Camera and microphone ready');
    } catch (error) {
      console.error('Camera initialization error:', error);
      showError('Unable to access camera/microphone');
    }
  };

  const startRecording = () => {
    if (!streamRef.current) {
      showError('Camera not ready');
      return;
    }

    try {
      chunksRef.current = [];
      
      const options = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000,
      };

      // Fallback for Safari/older browsers
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const newVideoBlobs = [...videoBlobs];
        newVideoBlobs[currentQuestion] = {
          blob,
          duration: recordedTime,
          questionId: questions[currentQuestion].id,
          timestamp: new Date().toISOString(),
        };
        setVideoBlobs(newVideoBlobs);
        showSuccess('Answer recorded');
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordedTime(0);
      showInfo('Recording started');
    } catch (error) {
      console.error('Recording start error:', error);
      showError('Failed to start recording');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      showInfo('Recording paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      showInfo('Recording resumed');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const retakeAnswer = () => {
    if (window.confirm('Are you sure you want to retake this answer? Previous recording will be deleted.')) {
      const newVideoBlobs = [...videoBlobs];
      newVideoBlobs[currentQuestion] = null;
      setVideoBlobs(newVideoBlobs);
      setRecordedTime(0);
      showInfo('Ready to record again');
    }
  };

  const previewAnswer = () => {
    if (videoBlobs[currentQuestion]) {
      const url = URL.createObjectURL(videoBlobs[currentQuestion].blob);
      if (previewVideoRef.current) {
        previewVideoRef.current.src = url;
      }
      setShowPreview(true);
    }
  };

  const nextQuestion = () => {
    if (!videoBlobs[currentQuestion]) {
      showError('Please record your answer first');
      return;
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setRecordedTime(0);
      showInfo('Moving to next question');
    } else {
      // All questions answered
      showSuccess('All questions completed!');
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setRecordedTime(0);
    }
  };

  const submitInterview = async () => {
    // Check if all questions are answered
    const unanswered = questions.filter((_, idx) => !videoBlobs[idx]);
    
    if (unanswered.length > 0) {
      showError(`Please answer all questions (${unanswered.length} remaining)`);
      return;
    }

    if (!window.confirm('Submit your interview? You cannot make changes after submission.')) {
      return;
    }

    // Simulate upload
    const loadingId = showLoading('Uploading interview...');

    try {
      // In production, upload to server/cloud storage
      const formData = new FormData();
      videoBlobs.forEach((videoData, index) => {
        if (videoData) {
          formData.append(`question_${index}`, videoData.blob, `answer_${index}.webm`);
          formData.append(`metadata_${index}`, JSON.stringify({
            questionId: videoData.questionId,
            duration: videoData.duration,
            timestamp: videoData.timestamp,
          }));
        }
      });

      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Store locally
      localStorage.setItem(`async-interview-${interviewId}`, JSON.stringify({
        completedAt: new Date().toISOString(),
        questionsAnswered: questions.length,
        totalDuration: videoBlobs.reduce((sum, v) => sum + (v?.duration || 0), 0),
      }));

      if (typeof loadingId === 'string') {
        toast.dismiss(loadingId);
      }
      showSuccess('Interview submitted successfully!');
      setSubmitted(true);

      // Animate completion
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (error) {
      if (typeof loadingId === 'string') {
        toast.dismiss(loadingId);
      }
      showError('Upload failed. Please try again.');
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return ((videoBlobs.filter(Boolean).length / questions.length) * 100).toFixed(0);
  };

  // Submission Success Screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0c0c1d] via-[#111133] to-[#1a0b2e] flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-2xl w-full glass rounded-3xl p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 bg-success-600 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-16 h-16 text-white" />
          </motion.div>

          <h2 className="text-4xl font-bold mb-4 text-royal-600">Interview Submitted!</h2>
          <p className="text-xl text-surface-600 dark:text-surface-400 mb-8">
            Your asynchronous interview has been successfully submitted.
          </p>

          <div className="p-6 bg-royal-50 dark:bg-royal-900/20 rounded-xl border border-royal-200 dark:border-royal-400/30 mb-8">
            <p className="text-royal-700 dark:text-royal-300 mb-4">
              🤖 Our AI system will analyze your responses within 24 hours.
            </p>
            <p className="text-sm text-surface-600 dark:text-surface-400">
              You'll receive detailed feedback on communication, clarity, content quality, and more.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 bg-royal-600 hover:bg-royal-700 text-white rounded-xl font-bold text-lg"
          >
            Back to Dashboard
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0c1d] via-[#111133] to-[#1a0b2e] pt-24 px-4 pb-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 text-navy-900 dark:text-white">Asynchronous <span class="text-royal-600">Interview</span></h1>
          <p className="text-surface-600 dark:text-surface-400">Record your answers at your own pace</p>
        </motion.div>

        {/* Progress Bar */}
        <div className="glass rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-surface-500 dark:text-surface-400">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span className="text-sm font-semibold">{getProgressPercentage()}% Complete</span>
          </div>
          <div className="h-2 bg-surface-200 dark:bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${getProgressPercentage()}%` }}
              className="h-full bg-royal-600"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Preview */}
            <div className="glass rounded-2xl p-6">
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover mirror"
                />
                
                {/* Recording Indicator */}
                {isRecording && !isPaused && (
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 px-4 py-2 rounded-full"
                  >
                    <div className="w-3 h-3 bg-white rounded-full" />
                    <span className="text-white font-semibold text-sm">REC</span>
                  </motion.div>
                )}

                {/* Paused Indicator */}
                {isPaused && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-yellow-500 px-4 py-2 rounded-full">
                    <Pause className="w-4 h-4 text-white" />
                    <span className="text-white font-semibold text-sm">PAUSED</span>
                  </div>
                )}

                {/* Timer */}
                <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono text-lg">
                      {formatTime(recordedTime)} / {formatTime(questions[currentQuestion].timeLimit)}
                    </span>
                  </div>
                </div>

                {/* Device Not Ready Overlay */}
                {!deviceReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                      <p>Initializing camera...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Recording Controls */}
              <div className="flex items-center justify-center gap-4">
                {!isRecording ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startRecording}
                    disabled={!deviceReady}
                    className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Video className="w-5 h-5" />
                    Start Recording
                  </motion.button>
                ) : (
                  <>
                    {!isPaused ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={pauseRecording}
                        className="px-6 py-4 bg-yellow-500 hover:bg-yellow-600 rounded-xl font-bold flex items-center gap-2"
                      >
                        <Pause className="w-5 h-5" />
                        Pause
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={resumeRecording}
                        className="px-6 py-4 bg-green-500 hover:bg-green-600 rounded-xl font-bold flex items-center gap-2"
                      >
                        <Play className="w-5 h-5" />
                        Resume
                      </motion.button>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={stopRecording}
                      className="px-6 py-4 bg-blue-500 hover:bg-blue-600 rounded-xl font-bold flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Stop & Save
                    </motion.button>
                  </>
                )}

                {videoBlobs[currentQuestion] && !isRecording && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={previewAnswer}
                      className="px-6 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold flex items-center gap-2"
                    >
                      <Eye className="w-5 h-5" />
                      Preview
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={retakeAnswer}
                      className="px-6 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold flex items-center gap-2"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Retake
                    </motion.button>
                  </>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="glass rounded-xl p-4 flex items-center justify-between">
              <button
                onClick={previousQuestion}
                disabled={currentQuestion === 0}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
              >
                ← Previous
              </button>

              <div className="flex gap-2">
                {questions.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-3 h-3 rounded-full ${
                      videoBlobs[idx]
                        ? 'bg-green-400'
                        : idx === currentQuestion
                        ? 'bg-blue-400'
                        : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>

              {currentQuestion < questions.length - 1 ? (
                <button
                  onClick={nextQuestion}
                  disabled={!videoBlobs[currentQuestion]}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  Next →
                </button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={submitInterview}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg font-bold flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Submit Interview
                </motion.button>
              )}
            </div>
          </div>

          {/* Question & Info Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Current Question */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Question {currentQuestion + 1}</h3>
                <span className="text-xs px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full uppercase">
                  {questions[currentQuestion].type}
                </span>
              </div>

              <p className="text-lg leading-relaxed mb-6">{questions[currentQuestion].text}</p>

              <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-semibold text-yellow-300">Time Limit</span>
                </div>
                <p className="text-2xl font-bold">{formatTime(questions[currentQuestion].timeLimit)}</p>
              </div>
            </div>

            {/* Tips */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">💡 Recording Tips</h3>
              <ul className="space-y-3 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Look at the camera, not the screen</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Speak clearly and at a moderate pace</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Take your time to think before answering</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Use the pause feature if you need a moment</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Preview your answer before moving on</span>
                </li>
              </ul>
            </div>

            {/* Status */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Progress</h3>
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      idx === currentQuestion
                        ? 'bg-blue-500/20 border border-blue-500/50'
                        : videoBlobs[idx]
                        ? 'bg-green-500/10'
                        : 'bg-white/5'
                    }`}
                  >
                    <span className="text-sm">Question {idx + 1}</span>
                    {videoBlobs[idx] ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : idx === currentQuestion ? (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-white/20 rounded-full" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview Modal */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowPreview(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="max-w-4xl w-full glass rounded-2xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold">Preview - Question {currentQuestion + 1}</h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <video
                  ref={previewVideoRef}
                  controls
                  className="w-full aspect-video bg-black rounded-xl"
                />

                <div className="mt-4 flex justify-end gap-3">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-semibold"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowPreview(false);
                      retakeAnswer();
                    }}
                    className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold"
                  >
                    Retake This Answer
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
};

export default AsyncInterview;

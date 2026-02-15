import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Clock,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Settings,
  Maximize,
  Minimize,
} from 'lucide-react';
import { gsap } from 'gsap';
import { showSuccess, showError, showInfo } from '../utils/toast';
import { useNavigate, useParams } from 'react-router-dom';
import { useTracking } from '../contexts/TrackingContext';

const VideoInterview = () => {
  const navigate = useNavigate();
  const { interviewId } = useParams();
  const { trackPageView, track } = useTracking();
  
  const [isInLobby, setIsInLobby] = useState(true);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState({
    camera: 'checking',
    microphone: 'checking',
  });

  // Track page view
  useEffect(() => {
    trackPageView('/video-interview');
  }, [trackPageView]);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenShareRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const roomRef = useRef(null);

  // Interview questions (mock data)
  const interviewQuestions = [
    {
      id: 1,
      text: 'Tell me about yourself and your background in software engineering.',
      type: 'behavioral',
      time: 300, // 5 minutes
    },
    {
      id: 2,
      text: 'Explain the concept of closures in JavaScript with a practical example.',
      type: 'technical',
      time: 480, // 8 minutes
    },
    {
      id: 3,
      text: 'How would you design a URL shortening service like bit.ly?',
      type: 'system-design',
      time: 900, // 15 minutes
    },
    {
      id: 4,
      text: 'Write a function to find the longest palindromic substring in a given string.',
      type: 'coding',
      time: 1200, // 20 minutes
    },
    {
      id: 5,
      text: 'Describe a challenging project you worked on and how you overcame obstacles.',
      type: 'behavioral',
      time: 420, // 7 minutes
    },
  ];

  // Initialize WebRTC
  useEffect(() => {
    if (!isInLobby && isInterviewActive) {
      initializeWebRTC();
    }

    return () => {
      cleanup();
    };
  }, [isInLobby, isInterviewActive]);

  // Timer
  useEffect(() => {
    let interval;
    if (isInterviewActive && !isInLobby) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isInterviewActive, isInLobby]);

  // Device check on mount
  useEffect(() => {
    checkDevices();
  }, []);

  const checkDevices = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setDeviceStatus({
        camera: 'ready',
        microphone: 'ready',
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      localStreamRef.current = stream;
    } catch (error) {
      console.error('Device access error:', error);
      setDeviceStatus({
        camera: error.name === 'NotFoundError' ? 'not-found' : 'denied',
        microphone: error.name === 'NotFoundError' ? 'not-found' : 'denied',
      });
      showError('Unable to access camera/microphone');
    }
  };

  const initializeWebRTC = async () => {
    try {
      // Get local stream if not already available
      if (!localStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }

      // Create peer connection
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      };

      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add local tracks
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // ICE candidate handling
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Send candidate to signaling server (mock)
          console.log('ICE candidate:', event.candidate);
        }
      };

      // Connection state monitoring
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          showSuccess('Connected to interviewer');
        }
      };

      // Mock: Simulate interviewer connection
      setTimeout(() => {
        simulateRemoteConnection();
      }, 2000);

    } catch (error) {
      console.error('WebRTC initialization error:', error);
      showError('Failed to establish connection');
    }
  };

  const simulateRemoteConnection = () => {
    // In production, this would be handled by signaling server
    showSuccess('Interviewer joined the room');
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setAudioEnabled(audioTrack.enabled);
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });

      screenStreamRef.current = screenStream;
      
      if (screenShareRef.current) {
        screenShareRef.current.srcObject = screenStream;
      }

      // Replace video track in peer connection
      if (peerConnectionRef.current) {
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track?.kind === 'video');
        
        if (sender) {
          sender.replaceTrack(videoTrack);
        }

        // Handle screen share stop
        videoTrack.onended = () => {
          stopScreenShare();
        };
      }

      setScreenSharing(true);
      showSuccess('Screen sharing started');
    } catch (error) {
      console.error('Screen share error:', error);
      showError('Failed to share screen');
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    // Restore camera video
    if (peerConnectionRef.current && localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      const sender = peerConnectionRef.current
        .getSenders()
        .find((s) => s.track?.kind === 'video');
      
      if (sender) {
        sender.replaceTrack(videoTrack);
      }
    }

    setScreenSharing(false);
    showInfo('Screen sharing stopped');
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const endInterview = () => {
    if (window.confirm('Are you sure you want to end the interview?')) {
      setIsInterviewActive(false);
      setInterviewEnded(true);
      cleanup();

      // Animate exit
      gsap.to(roomRef.current, {
        opacity: 0,
        scale: 0.9,
        duration: 0.5,
        onComplete: () => {
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        },
      });

      showSuccess('Interview completed');
    }
  };

  const cleanup = () => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  const joinInterview = () => {
    if (deviceStatus.camera !== 'ready' || deviceStatus.microphone !== 'ready') {
      showError('Please allow camera and microphone access');
      return;
    }

    setIsInLobby(false);
    setIsInterviewActive(true);

    // Animate entry
    setTimeout(() => {
      if (roomRef.current) {
        gsap.from(roomRef.current.children, {
          scale: 0.8,
          opacity: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: 'back.out(1.4)',
        });
      }
    }, 100);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const nextQuestion = () => {
    if (currentQuestion < interviewQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      showInfo('Moving to next question');
    } else {
      showSuccess('All questions completed!');
    }
  };

  // Lobby View
  if (isInLobby) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0c0c1d] via-[#111133] to-[#1a0b2e] flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-4xl w-full glass rounded-3xl p-8"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 text-navy-900 dark:text-white">Interview Lobby</h1>
            <p className="text-gray-400">Check your devices before joining</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Video Preview */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Video className="w-5 h-5" />
                Camera Preview
              </h3>
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover mirror"
                />
                {!videoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <VideoOff className="w-16 h-16 text-gray-600" />
                  </div>
                )}
              </div>
            </div>

            {/* Device Status */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Device Check</h3>
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Video className="w-5 h-5" />
                      <span>Camera</span>
                    </div>
                    {deviceStatus.camera === 'ready' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    {deviceStatus.camera === 'ready'
                      ? 'Working properly'
                      : 'Not accessible'}
                  </p>
                </div>

                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Mic className="w-5 h-5" />
                      <span>Microphone</span>
                    </div>
                    {deviceStatus.microphone === 'ready' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    {deviceStatus.microphone === 'ready'
                      ? 'Working properly'
                      : 'Not accessible'}
                  </p>
                </div>

                <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
                  <p className="text-sm text-blue-300">
                    💡 Tip: Use headphones for better audio quality
                  </p>
                </div>

                <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
                  <p className="text-sm text-yellow-300">
                    ⚠️ Ensure stable internet connection
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={toggleVideo}
              className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                videoEnabled
                  ? 'bg-white/10 hover:bg-white/20'
                  : 'bg-red-500/20 border border-red-500'
              }`}
            >
              {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              {videoEnabled ? 'Camera On' : 'Camera Off'}
            </button>

            <button
              onClick={toggleAudio}
              className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                audioEnabled
                  ? 'bg-white/10 hover:bg-white/20'
                  : 'bg-red-500/20 border border-red-500'
              }`}
            >
              {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              {audioEnabled ? 'Mic On' : 'Mic Off'}
            </button>
          </div>

          {/* Join Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={joinInterview}
            disabled={deviceStatus.camera !== 'ready' || deviceStatus.microphone !== 'ready'}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              deviceStatus.camera === 'ready' && deviceStatus.microphone === 'ready'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-lg hover:shadow-green-500/50'
                : 'bg-gray-700 cursor-not-allowed opacity-50'
            }`}
          >
            Join Interview
          </motion.button>

          <p className="text-center text-gray-400 text-sm mt-4">
            The interviewer will be notified when you join
          </p>
        </motion.div>
      </div>
    );
  }

  // Interview Ended View
  if (interviewEnded) {
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
            className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-16 h-16 text-white" />
          </motion.div>

          <h2 className="text-4xl font-bold mb-4 text-navy-900 dark:text-white">Interview Completed!</h2>
          <p className="text-xl text-gray-400 mb-8">
            Great job! Your interview has been successfully recorded.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-2xl font-bold text-blue-400">{formatTime(timeElapsed)}</p>
              <p className="text-sm text-gray-400">Duration</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-2xl font-bold text-royal-600">{currentQuestion + 1}</p>
              <p className="text-sm text-gray-400">Questions</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-2xl font-bold text-green-400">100%</p>
              <p className="text-sm text-gray-400">Completion</p>
            </div>
          </div>

          <div className="p-6 bg-blue-500/10 rounded-xl border border-blue-500/30 mb-8">
            <p className="text-blue-300 mb-4">
              📊 Your interview will be reviewed by our AI system and the interviewer.
            </p>
            <p className="text-sm text-gray-400">
              You'll receive detailed feedback within 24 hours via email.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 bg-royal-600 rounded-xl font-bold text-lg hover:bg-royal-700"
          >
            Back to Dashboard
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Main Interview Room
  return (
    <div
      ref={roomRef}
      className="min-h-screen bg-gradient-to-br from-[#0c0c1d] via-[#111133] to-[#1a0b2e] p-4 pt-20"
    >
      <div className="max-w-7xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 glass rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-400">Live Interview</span>
          </div>

          <div className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="w-5 h-5" />
            {formatTime(timeElapsed)}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex-1 grid lg:grid-cols-3 gap-4 mb-4">
          {/* Video Grid */}
          <div className="lg:col-span-2 space-y-4">
            {/* Remote Video (Interviewer) */}
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg">
                <p className="text-sm font-semibold">Interviewer</p>
              </div>
            </div>

            {/* Local Video + Screen Share */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover mirror"
                />
                {!videoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <VideoOff className="w-12 h-12 text-gray-600" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-3 py-1 rounded text-xs">
                  You
                </div>
              </div>

              {screenSharing && (
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                  <video
                    ref={screenShareRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-3 py-1 rounded text-xs flex items-center gap-1">
                    <Monitor className="w-3 h-3" />
                    Screen Share
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Question Panel */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Current Question</h3>
                <span className="text-sm text-gray-400">
                  {currentQuestion + 1} / {interviewQuestions.length}
                </span>
              </div>

              <div className="flex-1 mb-6">
                <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/30 mb-4">
                  <span className="text-xs text-blue-300 uppercase">
                    {interviewQuestions[currentQuestion].type}
                  </span>
                </div>

                <p className="text-lg leading-relaxed">
                  {interviewQuestions[currentQuestion].text}
                </p>
              </div>

              <button
                onClick={nextQuestion}
                disabled={currentQuestion === interviewQuestions.length - 1}
                className="w-full py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
              >
                Next Question
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleAudio}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                audioEnabled
                  ? 'bg-white/20 hover:bg-white/30'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                videoEnabled
                  ? 'bg-white/20 hover:bg-white/30'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={screenSharing ? stopScreenShare : startScreenShare}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                screenSharing
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              {screenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
            </motion.button>

            <div className="w-px h-10 bg-white/20 mx-2" />

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={endInterview}
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all"
            >
              <PhoneOff className="w-6 h-6" />
            </motion.button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
};

export default VideoInterview;

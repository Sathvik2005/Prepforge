// Voice Agent Service - Speech Recognition & Synthesis for Mock Interviews
class VoiceAgent {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.transcript = '';
    this.interimTranscript = '';
    this.listeners = {
      onResult: [],
      onInterim: [],
      onEnd: [],
      onError: [],
    };

    // Check browser support
    this.supportsRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    this.supportsSynthesis = 'speechSynthesis' in window;

    if (this.supportsRecognition) {
      this.initializeRecognition();
    }
  }

  // ===========================
  // Speech Recognition (Speech-to-Text)
  // ===========================

  initializeRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // Configuration
    this.recognition.continuous = true; // Keep listening
    this.recognition.interimResults = true; // Get partial results
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 3;

    // Event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      console.log('🎤 Voice recognition started');
    };

    this.recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          final += transcript + ' ';
          this.transcript += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (final) {
        this.listeners.onResult.forEach(callback => callback(final.trim(), this.transcript));
      }

      if (interim) {
        this.interimTranscript = interim;
        this.listeners.onInterim.forEach(callback => callback(interim));
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.listeners.onError.forEach(callback => callback(event.error));
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.listeners.onEnd.forEach(callback => callback(this.transcript));
      console.log('🎤 Voice recognition ended');
    };
  }

  startListening(options = {}) {
    if (!this.supportsRecognition) {
      throw new Error('Speech recognition not supported in this browser');
    }

    if (this.isListening) {
      console.warn('Already listening');
      return;
    }

    // Apply options
    if (options.lang) this.recognition.lang = options.lang;
    if (options.continuous !== undefined) this.recognition.continuous = options.continuous;
    if (options.interimResults !== undefined) this.recognition.interimResults = options.interimResults;

    this.transcript = '';
    this.interimTranscript = '';

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  pauseListening() {
    if (this.recognition && this.isListening) {
      this.recognition.abort();
    }
  }

  getTranscript() {
    return {
      final: this.transcript,
      interim: this.interimTranscript,
    };
  }

  clearTranscript() {
    this.transcript = '';
    this.interimTranscript = '';
  }

  // ===========================
  // Speech Synthesis (Text-to-Speech)
  // ===========================

  speak(text, options = {}) {
    if (!this.supportsSynthesis) {
      throw new Error('Speech synthesis not supported in this browser');
    }

    // Stop any ongoing speech
    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);

      // Configuration
      utterance.lang = options.lang || 'en-US';
      utterance.rate = options.rate || 1.0; // 0.1 to 10
      utterance.pitch = options.pitch || 1.0; // 0 to 2
      utterance.volume = options.volume || 1.0; // 0 to 1

      // Select voice
      if (options.voice) {
        const voices = this.synthesis.getVoices();
        const selectedVoice = voices.find(v => v.name === options.voice || v.lang === options.voice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      // Event handlers
      utterance.onstart = () => {
        this.isSpeaking = true;
        if (options.onStart) options.onStart();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        if (options.onEnd) options.onEnd();
        resolve();
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        if (options.onError) options.onError(event);
        reject(event);
      };

      utterance.onpause = () => {
        if (options.onPause) options.onPause();
      };

      utterance.onresume = () => {
        if (options.onResume) options.onResume();
      };

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    });
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  pauseSpeaking() {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.pause();
    }
  }

  resumeSpeaking() {
    if (this.synthesis && this.currentUtterance) {
      this.synthesis.resume();
    }
  }

  getVoices() {
    if (!this.supportsSynthesis) return [];
    return this.synthesis.getVoices();
  }

  // ===========================
  // Interview Assistant Functions
  // ===========================

  async askQuestion(question, options = {}) {
    await this.speak(`Interview question: ${question}`, {
      rate: 0.9,
      ...options,
    });
  }

  async provideFeedback(feedback, options = {}) {
    await this.speak(feedback, {
      rate: 0.95,
      pitch: 1.1,
      ...options,
    });
  }

  async giveHint(hint, options = {}) {
    await this.speak(`Here's a hint: ${hint}`, {
      rate: 0.9,
      pitch: 1.05,
      ...options,
    });
  }

  async encourageCandidate(message = "You're doing great! Keep going.", options = {}) {
    await this.speak(message, {
      rate: 1.0,
      pitch: 1.15,
      ...options,
    });
  }

  async announceTimeRemaining(minutes, options = {}) {
    const message = minutes > 1 
      ? `${minutes} minutes remaining`
      : minutes === 1
      ? '1 minute remaining'
      : '30 seconds remaining';
    
    await this.speak(message, {
      rate: 1.0,
      ...options,
    });
  }

  async greetInterviewee(name, options = {}) {
    await this.speak(`Hello ${name}! Welcome to your mock interview. Are you ready to begin?`, {
      rate: 0.95,
      pitch: 1.1,
      ...options,
    });
  }

  async concludeInterview(options = {}) {
    await this.speak(
      'Thank you for participating in this mock interview. Great job! We will now review your performance.',
      {
        rate: 0.9,
        ...options,
      }
    );
  }

  // ===========================
  // Real-time Transcription for Interview
  // ===========================

  startInterviewTranscription(callbacks = {}) {
    if (callbacks.onResult) {
      this.onResult(callbacks.onResult);
    }
    if (callbacks.onInterim) {
      this.onInterim(callbacks.onInterim);
    }
    if (callbacks.onEnd) {
      this.onEnd(callbacks.onEnd);
    }
    if (callbacks.onError) {
      this.onError(callbacks.onError);
    }

    this.startListening({
      continuous: true,
      interimResults: true,
    });
  }

  stopInterviewTranscription() {
    this.stopListening();
    return this.getTranscript().final;
  }

  // ===========================
  // AI Interview Coach Integration
  // ===========================

  async analyzeResponse(transcript) {
    // This would integrate with OpenAI API
    // For now, return basic analysis
    const wordCount = transcript.split(/\s+/).length;
    const hasFillerWords = /\b(um|uh|like|you know|actually)\b/gi.test(transcript);
    const speakingRate = wordCount; // words per response

    return {
      wordCount,
      hasFillerWords,
      fillerWordCount: (transcript.match(/\b(um|uh|like|you know|actually)\b/gi) || []).length,
      speakingRate,
      clarity: hasFillerWords ? 'moderate' : 'good',
      suggestions: this.generateSuggestions(transcript, hasFillerWords),
    };
  }

  generateSuggestions(transcript, hasFillerWords) {
    const suggestions = [];

    if (hasFillerWords) {
      suggestions.push('Try to reduce filler words like "um", "uh", and "like"');
    }

    const wordCount = transcript.split(/\s+/).length;
    if (wordCount < 20) {
      suggestions.push('Consider providing more detailed answers');
    } else if (wordCount > 200) {
      suggestions.push('Try to be more concise in your responses');
    }

    if (!/\b(because|therefore|however|additionally)\b/gi.test(transcript)) {
      suggestions.push('Use connecting words to structure your answer better');
    }

    return suggestions;
  }

  // ===========================
  // Event Listeners
  // ===========================

  onResult(callback) {
    this.listeners.onResult.push(callback);
    return () => {
      this.listeners.onResult = this.listeners.onResult.filter(cb => cb !== callback);
    };
  }

  onInterim(callback) {
    this.listeners.onInterim.push(callback);
    return () => {
      this.listeners.onInterim = this.listeners.onInterim.filter(cb => cb !== callback);
    };
  }

  onEnd(callback) {
    this.listeners.onEnd.push(callback);
    return () => {
      this.listeners.onEnd = this.listeners.onEnd.filter(cb => cb !== callback);
    };
  }

  onError(callback) {
    this.listeners.onError.push(callback);
    return () => {
      this.listeners.onError = this.listeners.onError.filter(cb => cb !== callback);
    };
  }

  // ===========================
  // Voice Commands for Interview Control
  // ===========================

  setupVoiceCommands(commandMap = {}) {
    const defaultCommands = {
      'next question': () => commandMap.nextQuestion?.(),
      'repeat question': () => commandMap.repeatQuestion?.(),
      'skip question': () => commandMap.skipQuestion?.(),
      'get hint': () => commandMap.getHint?.(),
      'end interview': () => commandMap.endInterview?.(),
      'pause interview': () => commandMap.pauseInterview?.(),
      'resume interview': () => commandMap.resumeInterview?.(),
      ...commandMap,
    };

    this.onResult((transcript) => {
      const lowerTranscript = transcript.toLowerCase().trim();
      
      for (const [command, action] of Object.entries(defaultCommands)) {
        if (lowerTranscript.includes(command.toLowerCase())) {
          action();
          break;
        }
      }
    });
  }

  // ===========================
  // Language Support
  // ===========================

  setLanguage(lang) {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  getSupportedLanguages() {
    return [
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-GB', name: 'English (UK)' },
      { code: 'es-ES', name: 'Spanish (Spain)' },
      { code: 'es-MX', name: 'Spanish (Mexico)' },
      { code: 'fr-FR', name: 'French' },
      { code: 'de-DE', name: 'German' },
      { code: 'zh-CN', name: 'Chinese (Mandarin)' },
      { code: 'hi-IN', name: 'Hindi' },
      { code: 'ja-JP', name: 'Japanese' },
      { code: 'ko-KR', name: 'Korean' },
    ];
  }

  // ===========================
  // Browser Compatibility Check
  // ===========================

  getCapabilities() {
    return {
      recognition: this.supportsRecognition,
      synthesis: this.supportsSynthesis,
      voicesAvailable: this.getVoices().length > 0,
      recommendedBrowser: !this.supportsRecognition || !this.supportsSynthesis 
        ? 'Please use Chrome, Edge, or Safari for full voice features'
        : null,
    };
  }

  // ===========================
  // Utility Functions
  // ===========================

  async testVoice() {
    await this.speak('Voice agent is working correctly!', {
      rate: 1.0,
      pitch: 1.0,
    });
  }

  destroy() {
    this.stopListening();
    this.stopSpeaking();
    this.listeners = {
      onResult: [],
      onInterim: [],
      onEnd: [],
      onError: [],
    };
  }
}

// Create singleton instance
const voiceAgent = new VoiceAgent();

export default voiceAgent;

// Export class for custom instances
export { VoiceAgent };

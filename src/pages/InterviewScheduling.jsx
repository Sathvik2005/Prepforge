import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Users,
  CheckCircle2,
  Globe,
  Star,
  Award,
  Briefcase,
  Code,
  Brain,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { gsap } from 'gsap';
import { showSuccess, showError } from '../utils/toast';
import { useNavigate } from 'react-router-dom';

const InterviewScheduling = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedInterviewer, setSelectedInterviewer] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [interviewMode, setInterviewMode] = useState(null); // 'live' or 'async'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookedInterview, setBookedInterview] = useState(null);
  const confirmationRef = useRef(null);

  // Interview types
  const interviewTypes = [
    {
      id: 'frontend',
      name: 'Frontend Engineering',
      icon: Code,
      color: 'bg-royal-600',
      duration: 60,
    },
    {
      id: 'backend',
      name: 'Backend Engineering',
      icon: Briefcase,
      color: 'bg-navy-700',
      duration: 60,
    },
    {
      id: 'dsa',
      name: 'Data Structures & Algorithms',
      icon: Brain,
      color: 'bg-success-600',
      duration: 90,
    },
    {
      id: 'system-design',
      name: 'System Design',
      icon: Globe,
      color: 'bg-warning-600',
      duration: 75,
    },
    {
      id: 'behavioral',
      name: 'Behavioral / HR',
      icon: MessageSquare,
      color: 'bg-royal-500',
      duration: 45,
    },
  ];

  // Mock interviewers
  const interviewers = [
    {
      id: 1,
      name: 'Sarah Chen',
      role: 'Senior Frontend Engineer',
      company: 'Google',
      rating: 4.9,
      interviews: 342,
      avatar: '👩‍💻',
      specialties: ['frontend', 'dsa'],
      availability: ['2026-01-20', '2026-01-21', '2026-01-22'],
    },
    {
      id: 2,
      name: 'Alex Kumar',
      role: 'Backend Architect',
      company: 'Amazon',
      rating: 4.8,
      interviews: 278,
      avatar: '👨‍💼',
      specialties: ['backend', 'system-design', 'dsa'],
      availability: ['2026-01-20', '2026-01-23', '2026-01-24'],
    },
    {
      id: 3,
      name: 'Emily Johnson',
      role: 'Engineering Manager',
      company: 'Microsoft',
      rating: 5.0,
      interviews: 521,
      avatar: '👩‍🏫',
      specialties: ['behavioral', 'system-design'],
      availability: ['2026-01-21', '2026-01-22', '2026-01-25'],
    },
    {
      id: 4,
      name: 'Raj Patel',
      role: 'Staff Engineer',
      company: 'Meta',
      rating: 4.7,
      interviews: 189,
      avatar: '👨‍🔬',
      specialties: ['frontend', 'backend', 'dsa'],
      availability: ['2026-01-20', '2026-01-24', '2026-01-26'],
    },
  ];

  // Generate time slots
  const generateTimeSlots = (date) => {
    const slots = [];
    const baseDate = new Date(date);
    
    // Generate slots from 9 AM to 6 PM
    for (let hour = 9; hour <= 18; hour++) {
      ['00', '30'].forEach((minute) => {
        if (hour === 18 && minute === '30') return; // Skip 6:30 PM
        
        const time = `${hour.toString().padStart(2, '0')}:${minute}`;
        const slotDate = new Date(baseDate);
        slotDate.setHours(hour, parseInt(minute), 0, 0);
        
        // Mock: mark some slots as booked
        const isBooked = Math.random() > 0.7;
        
        slots.push({
          time,
          timestamp: slotDate.getTime(),
          available: !isBooked,
        });
      });
    }
    
    return slots;
  };

  // Calendar generation
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      days.push(dateObj);
    }
    
    return days;
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const isDateAvailable = (date) => {
    if (!selectedInterviewer) return false;
    const dateStr = formatDate(date);
    return selectedInterviewer.availability.includes(dateStr);
  };

  const isDateInPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Book interview
  const handleBookInterview = async () => {
    if (!selectedDate || !selectedSlot || !selectedInterviewer || !selectedType || !interviewMode) {
      showError('Please complete all selections');
      return;
    }

    const booking = {
      id: `INT-${Date.now()}`,
      date: formatDate(selectedDate),
      time: selectedSlot.time,
      interviewer: selectedInterviewer,
      type: selectedType,
      mode: interviewMode,
      status: 'scheduled',
      meetingLink: interviewMode === 'live' 
        ? `https://meet.prepforge.com/${Date.now()}` 
        : null,
      createdAt: new Date().toISOString(),
    };

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setBookedInterview(booking);
    setShowConfirmation(true);

    // Animate confirmation
    setTimeout(() => {
      if (confirmationRef.current) {
        gsap.from(confirmationRef.current.children, {
          y: 50,
          opacity: 0,
          duration: 0.6,
          stagger: 0.15,
          ease: 'back.out(1.4)',
        });
      }
    }, 100);

    showSuccess('Interview scheduled successfully! 🎉');

    // Save to localStorage (mock backend)
    const existingBookings = JSON.parse(localStorage.getItem('interviews') || '[]');
    existingBookings.push(booking);
    localStorage.setItem('interviews', JSON.stringify(existingBookings));
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonth(newDate);
  };

  const monthDays = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (showConfirmation && bookedInterview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0c0c1d] via-[#111133] to-[#1a0b2e] pt-24 px-4 pb-12">
        <div className="max-w-3xl mx-auto" ref={confirmationRef}>
          {/* Success Animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex justify-center mb-8"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-16 h-16 text-white" />
            </div>
          </motion.div>

          {/* Confirmation Card */}
          <div className="glass rounded-3xl p-8 mb-6">
            <h2 className="text-4xl font-bold text-center mb-2 text-royal-600">
              Interview Scheduled!
            </h2>
            <p className="text-surface-600 dark:text-surface-400 text-center mb-8">
              Your interview has been confirmed. Check your email for details.
            </p>

            {/* Booking Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <span className="text-gray-400">Interview Type</span>
                <span className="text-white font-semibold">{bookedInterview.type.name}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <span className="text-gray-400">Mode</span>
                <span className="text-white font-semibold capitalize">
                  {bookedInterview.mode === 'live' ? 'Live Video' : 'Asynchronous'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <span className="text-gray-400">Date & Time</span>
                <span className="text-white font-semibold">
                  {bookedInterview.date} at {bookedInterview.time}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <span className="text-gray-400">Interviewer</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{bookedInterview.interviewer.avatar}</span>
                  <span className="text-white font-semibold">{bookedInterview.interviewer.name}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <span className="text-gray-400">Duration</span>
                <span className="text-white font-semibold">{bookedInterview.type.duration} minutes</span>
              </div>

              {bookedInterview.meetingLink && (
                <div className="p-4 bg-royal-50 dark:bg-royal-900/20 rounded-xl border border-royal-200 dark:border-royal-400/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="w-5 h-5 text-royal-600 dark:text-royal-400" />
                    <span className="text-navy-900 dark:text-white font-semibold">Meeting Link</span>
                  </div>
                  <p className="text-royal-600 dark:text-royal-300 text-sm break-all">{bookedInterview.meetingLink}</p>
                  <p className="text-gray-400 text-xs mt-2">
                    Link will be active 10 minutes before the scheduled time
                  </p>
                </div>
              )}

              <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
                <p className="text-yellow-300 text-sm">
                  ⏰ You'll receive reminders 24 hours and 1 hour before the interview
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-4 bg-royal-600 hover:bg-royal-700 text-white rounded-xl font-semibold hover:scale-105 transition-transform"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setSelectedDate(null);
                  setSelectedSlot(null);
                  setSelectedInterviewer(null);
                  setSelectedType(null);
                  setInterviewMode(null);
                }}
                className="flex-1 py-4 bg-white/10 rounded-xl font-semibold hover:bg-white/20 transition-colors"
              >
                Schedule Another
              </button>
            </div>
          </div>

          {/* Add to Calendar */}
          <div className="text-center">
            <button className="text-blue-400 hover:text-blue-300 transition-colors">
              + Add to Calendar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0c1d] via-[#111133] to-[#1a0b2e] pt-24 px-4 pb-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold mb-4 text-navy-900 dark:text-white">
            Schedule Your <span className="text-royal-600">Interview</span>
          </h1>
          <p className="text-xl text-surface-600 dark:text-surface-400">
            Book a live or asynchronous interview with industry experts
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Panel - Selection Steps */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Interview Mode */}
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-6"
            >
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-royal-600 rounded-full flex items-center justify-center text-sm text-white">
                  1
                </div>
                Choose Interview Mode
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setInterviewMode('live')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    interviewMode === 'live'
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <Video className="w-10 h-10 text-blue-400 mb-3" />
                  <h4 className="text-xl font-bold mb-2">Live Video Interview</h4>
                  <p className="text-gray-400 text-sm">
                    Real-time interview with an expert. Interactive, with instant feedback.
                  </p>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setInterviewMode('async')}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    interviewMode === 'async'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <Clock className="w-10 h-10 text-purple-400 mb-3" />
                  <h4 className="text-xl font-bold mb-2">Asynchronous Interview</h4>
                  <p className="text-gray-400 text-sm">
                    Record answers at your own pace. Review before submission.
                  </p>
                </motion.button>
              </div>
            </motion.div>

            {/* Step 2: Interview Type */}
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-2xl p-6"
            >
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-royal-600 rounded-full flex items-center justify-center text-sm text-white">
                  2
                </div>
                Select Interview Type
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {interviewTypes.map((type) => (
                  <motion.button
                    key={type.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedType(type)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedType?.id === type.id
                        ? 'border-royal-500 bg-royal-500/20'
                        : 'border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-white/5 hover:bg-surface-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className={`w-12 h-12 ${type.color} rounded-xl flex items-center justify-center mb-3 mx-auto`}>
                      <type.icon className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-semibold mb-1 text-sm">{type.name}</h4>
                    <p className="text-gray-400 text-xs">{type.duration} min</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Step 3: Select Interviewer (only for live mode) */}
            {interviewMode === 'live' && (
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-2xl p-6"
              >
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-royal-600 rounded-full flex items-center justify-center text-sm text-white">
                    3
                  </div>
                  Choose Your Interviewer
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {interviewers
                    .filter((int) => !selectedType || int.specialties.includes(selectedType.id))
                    .map((interviewer) => (
                      <motion.button
                        key={interviewer.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedInterviewer(interviewer)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          selectedInterviewer?.id === interviewer.id
                            ? 'border-royal-500 bg-royal-500/20'
                            : 'border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-white/5 hover:bg-surface-100 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-4xl">{interviewer.avatar}</div>
                          <div className="flex-1">
                            <h4 className="font-bold mb-1">{interviewer.name}</h4>
                            <p className="text-sm text-gray-400 mb-2">
                              {interviewer.role} at {interviewer.company}
                            </p>
                            <div className="flex items-center gap-4 text-xs">
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                <span className="text-yellow-400">{interviewer.rating}</span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-400">
                                <Users className="w-3 h-3" />
                                <span>{interviewer.interviews} interviews</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                </div>
              </motion.div>
            )}

            {/* Step 4: Calendar */}
            {((interviewMode === 'live' && selectedInterviewer) || interviewMode === 'async') && (
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="glass rounded-2xl p-6"
              >
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-royal-600 rounded-full flex items-center justify-center text-sm text-white">
                    {interviewMode === 'live' ? '4' : '3'}
                  </div>
                  Select Date & Time
                </h3>

                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <h4 className="text-xl font-bold">{monthName}</h4>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2 mb-6">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-sm text-gray-400 font-semibold py-2">
                      {day}
                    </div>
                  ))}
                  {monthDays.map((date, index) => {
                    if (!date) {
                      return <div key={`empty-${index}`} />;
                    }

                    const isAvailable = interviewMode === 'async' || isDateAvailable(date);
                    const isPast = isDateInPast(date);
                    const isSelected = selectedDate && formatDate(date) === formatDate(selectedDate);

                    return (
                      <motion.button
                        key={index}
                        whileHover={isAvailable && !isPast ? { scale: 1.1 } : {}}
                        whileTap={isAvailable && !isPast ? { scale: 0.9 } : {}}
                        onClick={() => {
                          if (isAvailable && !isPast) {
                            setSelectedDate(date);
                            setSelectedSlot(null);
                          }
                        }}
                        disabled={!isAvailable || isPast}
                        className={`aspect-square rounded-lg flex items-center justify-center text-sm font-semibold transition-all ${
                          isSelected
                            ? 'bg-royal-600 text-white'
                            : isAvailable && !isPast
                            ? 'bg-surface-50 dark:bg-white/5 hover:bg-surface-100 dark:hover:bg-white/10 border border-surface-200 dark:border-white/10'
                            : 'bg-surface-50 dark:bg-white/5 text-surface-400 dark:text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        {date.getDate()}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="border-t border-white/10 pt-6"
                  >
                    <h4 className="text-lg font-bold mb-4">Available Time Slots</h4>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                      {generateTimeSlots(selectedDate).map((slot, index) => (
                        <motion.button
                          key={index}
                          whileHover={slot.available ? { scale: 1.05 } : {}}
                          whileTap={slot.available ? { scale: 0.95 } : {}}
                          onClick={() => slot.available && setSelectedSlot(slot)}
                          disabled={!slot.available}
                          className={`py-3 rounded-lg text-sm font-semibold transition-all ${
                            selectedSlot?.time === slot.time
                              ? 'bg-royal-600 text-white'
                              : slot.available
                              ? 'bg-surface-50 dark:bg-white/5 hover:bg-surface-100 dark:hover:bg-white/10 border border-surface-200 dark:border-white/10'
                              : 'bg-surface-50 dark:bg-white/5 text-surface-400 dark:text-gray-600 cursor-not-allowed line-through'
                          }`}
                        >
                          {slot.time}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>

          {/* Right Panel - Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-2xl p-6 sticky top-24"
            >
              <h3 className="text-xl font-bold mb-6">Booking Summary</h3>

              <div className="space-y-4 mb-6">
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Interview Mode</p>
                  <p className="font-semibold">
                    {interviewMode
                      ? interviewMode === 'live'
                        ? '🎥 Live Video'
                        : '⏱️ Asynchronous'
                      : 'Not selected'}
                  </p>
                </div>

                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Interview Type</p>
                  <p className="font-semibold">{selectedType ? selectedType.name : 'Not selected'}</p>
                </div>

                {interviewMode === 'live' && (
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Interviewer</p>
                    <p className="font-semibold">
                      {selectedInterviewer ? selectedInterviewer.name : 'Not selected'}
                    </p>
                  </div>
                )}

                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Date</p>
                  <p className="font-semibold">
                    {selectedDate ? formatDate(selectedDate) : 'Not selected'}
                  </p>
                </div>

                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Time</p>
                  <p className="font-semibold">{selectedSlot ? selectedSlot.time : 'Not selected'}</p>
                </div>

                {selectedType && (
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Duration</p>
                    <p className="font-semibold">{selectedType.duration} minutes</p>
                  </div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBookInterview}
                disabled={!selectedDate || !selectedSlot || !selectedType || !interviewMode || (interviewMode === 'live' && !selectedInterviewer)}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  selectedDate && selectedSlot && selectedType && interviewMode && (interviewMode === 'async' || selectedInterviewer)
                    ? 'bg-royal-600 hover:bg-royal-700 text-white hover:shadow-lg hover:shadow-royal-500/30'
                    : 'bg-surface-300 dark:bg-gray-700 cursor-not-allowed opacity-50'
                }`}
              >
                Book Interview
              </motion.button>

              <p className="text-xs text-gray-400 text-center mt-4">
                Free cancellation up to 24 hours before
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewScheduling;

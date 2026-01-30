import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Sparkles,
  Target,
  Brain,
  Code,
  TrendingUp,
  Zap,
  Clock,
  Award,
  Users,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

gsap.registerPlugin(ScrollTrigger);

const Landing = () => {
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const statsRef = useRef(null);

  useEffect(() => {
    // Hero animations
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      tl.from('.hero-title', {
        y: 100,
        opacity: 0,
        duration: 1,
        ease: 'power4.out',
      })
        .from(
          '.hero-subtitle',
          {
            y: 50,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out',
          },
          '-=0.5'
        )
        .from(
          '.hero-buttons',
          {
            y: 30,
            opacity: 0,
            duration: 0.6,
            ease: 'power2.out',
          },
          '-=0.4'
        )
        .from(
          '.hero-card',
          {
            y: 80,
            opacity: 0,
            duration: 0.8,
            stagger: 0.2,
            ease: 'power3.out',
          },
          '-=0.3'
        );
    }, heroRef);

    // Feature cards scroll animation
    const features = gsap.utils.toArray('.feature-card');
    features.forEach((card) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 80%',
          end: 'top 50%',
          scrub: 1,
        },
        y: 100,
        opacity: 0,
        scale: 0.9,
      });
    });

    // Animated stats counter
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach((stat) => {
      const target = parseInt(stat.getAttribute('data-target'));
      gsap.from(stat, {
        scrollTrigger: {
          trigger: stat,
          start: 'top 80%',
        },
        textContent: 0,
        duration: 2,
        ease: 'power1.out',
        snap: { textContent: 1 },
        onUpdate: function () {
          stat.textContent = Math.ceil(this.targets()[0].textContent);
        },
      });
    });

    return () => ctx.revert();
  }, []);

  const features = [
    {
      icon: Brain,
      title: 'AI Smart Roadmap',
      description:
        'Get personalized daily learning plans that adapt to your progress and timeline.',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: Target,
      title: 'Adaptive Questions',
      description:
        'Questions that scale difficulty based on your accuracy and speed.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Code,
      title: 'Code Playground',
      description:
        'Visualize code execution with stack, heap, and variable tracking.',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: Sparkles,
      title: 'Mock Interviews',
      description:
        'Realistic interview simulations with AI feedback and scoring.',
      gradient: 'from-orange-500 to-red-500',
    },
    {
      icon: TrendingUp,
      title: 'Analytics Dashboard',
      description:
        'Track progress with animated charts and improvement curves.',
      gradient: 'from-indigo-500 to-purple-500',
    },
    {
      icon: Zap,
      title: 'Gamification',
      description:
        'Daily streaks, milestones, and dopamine-driven learning rewards.',
      gradient: 'from-yellow-500 to-orange-500',
    },
  ];

  const stats = [
    { number: 50000, label: 'Active Users', suffix: '+' },
    { number: 1000000, label: 'Questions Solved', suffix: '+' },
    { number: 95, label: 'Success Rate', suffix: '%' },
    { number: 500, label: 'Mock Interviews Daily', suffix: '+' },
  ];

  const heroCards = [
    {
      title: 'Resume Analysis',
      description: 'Upload resume → Get skill gaps → Auto practice sets',
      icon: '📄',
    },
    {
      title: 'Mistake Memory',
      description: 'Tracks wrong answers → Creates revision mode',
      icon: '🧠',
    },
    {
      title: 'Focus Mode',
      description: 'Distraction-free interface for deep work',
      icon: '🎯',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center pt-20 pb-32 px-6 overflow-hidden"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="container mx-auto relative z-10">
          <div className="text-center max-w-5xl mx-auto">
            {/* Title */}
            <motion.div className="hero-title mb-6">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-4">
                Master Your{' '}
                <span className="gradient-text">Interview Prep</span>
              </h1>
              <div className="flex items-center justify-center space-x-2 text-blue-400">
                <Sparkles className="w-6 h-6 animate-pulse" />
                <span className="text-xl">AI-Powered Adaptive Learning</span>
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
            </motion.div>

            {/* Subtitle */}
            <p className="hero-subtitle text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Get personalized roadmaps, adaptive questions, mock interviews, and
              stunning visualizations. Transform your preparation with AI.
            </p>

            {/* CTA Buttons */}
            <div className="hero-buttons flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-20">
              <Link
                to="/register"
                className="px-8 py-4 text-lg font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all duration-300 glow flex items-center space-x-2 group"
              >
                <span>Start Free Today</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="#features"
                className="px-8 py-4 text-lg font-semibold rounded-xl glass hover:glass-strong transition-all duration-300 flex items-center space-x-2"
              >
                <span>Explore Features</span>
              </Link>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {heroCards.map((card, index) => (
                <motion.div
                  key={index}
                  className="hero-card glass-strong rounded-2xl p-6 hover:scale-105 transition-transform duration-300 cursor-pointer group"
                  whileHover={{ y: -10 }}
                >
                  <div className="text-4xl mb-3">{card.icon}</div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-400 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-400">{card.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="py-20 px-6 relative">
        <div className="container mx-auto">
          <div className="glass-strong rounded-3xl p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-5xl font-bold gradient-text-blue mb-2">
                    <span className="stat-number" data-target={stat.number}>
                      0
                    </span>
                    {stat.suffix}
                  </div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} id="features" className="py-32 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="gradient-text">Powerful Features</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Everything you need to ace your interviews, all in one platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="feature-card glass-strong rounded-2xl p-8 hover:scale-105 transition-all duration-300 group cursor-pointer"
                whileHover={{ y: -10 }}
              >
                <div
                  className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform glow-purple`}
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 group-hover:text-blue-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-32 px-6 relative">
        <div className="container mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="gradient-text">How It Works</span>
            </h2>
          </div>

          <div className="max-w-4xl mx-auto space-y-12">
            {[
              {
                step: '01',
                title: 'Create Your Profile',
                description:
                  'Sign up and tell us about your interview goals and timeline',
              },
              {
                step: '02',
                title: 'Get AI Roadmap',
                description:
                  'Receive a personalized daily learning plan with adaptive scheduling',
              },
              {
                step: '03',
                title: 'Practice & Learn',
                description:
                  'Solve adaptive questions, take mock interviews, and code challenges',
              },
              {
                step: '04',
                title: 'Track Progress',
                description:
                  'Monitor your improvement with detailed analytics and insights',
              },
              {
                step: '05',
                title: 'Ace Your Interview',
                description:
                  'Walk into your interview confident and well-prepared',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                className="flex items-start space-x-6 glass-strong rounded-2xl p-8"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="text-6xl font-bold gradient-text-blue flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-400 flex-shrink-0 mt-2" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="container mx-auto">
          <div className="glass-strong rounded-3xl p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
            <div className="relative z-10">
              <h2 className="text-5xl md:text-6xl font-bold mb-6">
                Ready to <span className="gradient-text">Transform</span> Your
                Prep?
              </h2>
              <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
                Join thousands of successful candidates who aced their interviews
                with PrepForge
              </p>
              <Link
                to="/register"
                className="inline-flex items-center space-x-2 px-10 py-5 text-xl font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all duration-300 glow group"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;

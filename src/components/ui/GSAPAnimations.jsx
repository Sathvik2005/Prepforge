import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Magnetic hover effect for buttons and cards
export const useMagneticEffect = (ref, strength = 0.3) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      gsap.to(element, {
        x: x * strength,
        y: y * strength,
        duration: 0.3,
        ease: 'power2.out',
      });
    };

    const handleMouseLeave = () => {
      gsap.to(element, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.3)',
      });
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [ref, strength]);
};

// Text reveal animation
export const useTextReveal = (ref, options = {}) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const text = element.textContent;
    element.innerHTML = '';
    
    // Split text into characters
    text.split('').forEach((char, i) => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.display = 'inline-block';
      span.style.opacity = '0';
      span.style.transform = 'translateY(50px) rotateX(-90deg)';
      element.appendChild(span);
    });

    const chars = element.querySelectorAll('span');

    gsap.to(chars, {
      opacity: 1,
      y: 0,
      rotateX: 0,
      duration: 0.8,
      stagger: 0.03,
      ease: 'back.out(1.7)',
      scrollTrigger: {
        trigger: element,
        start: 'top 80%',
        ...options.scrollTrigger,
      },
    });
  }, [ref, options]);
};

// Stagger fade in for lists
export const useStaggerFadeIn = (containerRef, itemSelector = '.stagger-item', options = {}) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll(itemSelector);

    gsap.fromTo(items, 
      {
        opacity: 0,
        y: 60,
        scale: 0.9,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: container,
          start: 'top 75%',
          ...options.scrollTrigger,
        },
      }
    );
  }, [containerRef, itemSelector, options]);
};

// Parallax scroll effect
export const useParallax = (ref, speed = 0.5) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    gsap.to(element, {
      y: () => -ScrollTrigger.maxScroll(window) * speed,
      ease: 'none',
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
      },
    });
  }, [ref, speed]);
};

// Floating animation
export const useFloating = (ref, options = {}) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const {
      yAmount = 20,
      xAmount = 10,
      rotation = 5,
      duration = 3,
    } = options;

    gsap.to(element, {
      y: `+=${yAmount}`,
      x: `+=${xAmount}`,
      rotation: rotation,
      duration: duration,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }, [ref, options]);
};

// Spotlight follow cursor
export const SpotlightCursor = () => {
  const spotlightRef = useRef(null);

  useEffect(() => {
    const spotlight = spotlightRef.current;
    if (!spotlight) return;

    const handleMouseMove = (e) => {
      gsap.to(spotlight, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.3,
        ease: 'power2.out',
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={spotlightRef}
      className="fixed w-[600px] h-[600px] rounded-full pointer-events-none z-0 opacity-20 dark:opacity-10"
      style={{
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
        transform: 'translate(-50%, -50%)',
        left: 0,
        top: 0,
      }}
    />
  );
};

// Scroll progress indicator
export const ScrollProgress = () => {
  const progressRef = useRef(null);

  useEffect(() => {
    const progress = progressRef.current;
    if (!progress) return;

    gsap.to(progress, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.3,
      },
    });
  }, []);

  return (
    <div
      ref={progressRef}
      className="fixed top-0 left-0 right-0 h-1 bg-royal-600 origin-left z-50"
      style={{ transform: 'scaleX(0)' }}
    />
  );
};

// Morphing blob background
export const MorphingBlob = ({ className = '' }) => {
  const blobRef = useRef(null);

  useEffect(() => {
    const blob = blobRef.current;
    if (!blob) return;

    // Animate the blob path
    const paths = [
      'M440.5,320.5Q418,391,355.5,442.5Q293,494,226,450.5Q159,407,99,339Q39,271,49.5,197.5Q60,124,120.5,69Q181,14,248,47Q315,80,375.5,117.5Q436,155,456,227.5Q476,300,440.5,320.5Z',
      'M411.39826,313.90633Q402.59677,377.81265,## 349.19354,403.8923Q295.79032,429.97195,226.18065,432.87903Q156.57097,435.78611,## 127.48387,378.24116Q98.39677,320.69621,66.04155,235.59677Q33.68633,150.49733,## 97.92345,77.49289Q162.16058,4.48845,245.18065,34.93215Q328.20073,65.37584,## 356.45765,117.18792Q384.71457,169,404.0291,219.5Q423.34362,270,411.39826,313.90633Z',
      'M438.5,326Q427,402,355,439Q283,476,222,434Q161,392,108.5,339Q56,286,65,217.5Q74,149,127,96.5Q180,44,251.5,36.5Q323,29,378.5,86Q434,143,442,221.5Q450,300,438.5,326Z',
    ];

    let currentPath = 0;

    const animateBlob = () => {
      currentPath = (currentPath + 1) % paths.length;
      gsap.to(blob, {
        attr: { d: paths[currentPath] },
        duration: 4,
        ease: 'sine.inOut',
        onComplete: animateBlob,
      });
    };

    animateBlob();
  }, []);

  return (
    <svg
      viewBox="0 0 500 500"
      className={`absolute w-[800px] h-[800px] opacity-10 dark:opacity-5 ${className}`}
    >
      <defs>
        <linearGradient id="blobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
      </defs>
      <path
        ref={blobRef}
        d="M440.5,320.5Q418,391,355.5,442.5Q293,494,226,450.5Q159,407,99,339Q39,271,49.5,197.5Q60,124,120.5,69Q181,14,248,47Q315,80,375.5,117.5Q436,155,456,227.5Q476,300,440.5,320.5Z"
        fill="url(#blobGradient)"
      />
    </svg>
  );
};

// Number counter animation
export const AnimatedCounter = ({ end, duration = 2, suffix = '', prefix = '' }) => {
  const counterRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const counter = counterRef.current;
    if (!counter || hasAnimated.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            
            gsap.fromTo(
              { val: 0 },
              {
                val: end,
                duration: duration,
                ease: 'power2.out',
                onUpdate: function() {
                  counter.textContent = `${prefix}${Math.round(this.targets()[0].val)}${suffix}`;
                },
              }
            );
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(counter);
    return () => observer.disconnect();
  }, [end, duration, suffix, prefix]);

  return <span ref={counterRef}>0</span>;
};

// Wave animation component
export const WaveAnimation = ({ className = '' }) => {
  return (
    <div className={`absolute inset-x-0 bottom-0 overflow-hidden ${className}`}>
      <svg
        className="relative w-full h-24"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          className="fill-surface-100 dark:fill-navy-800 animate-wave"
          d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
      </svg>
    </div>
  );
};

export default {
  useMagneticEffect,
  useTextReveal,
  useStaggerFadeIn,
  useParallax,
  useFloating,
  SpotlightCursor,
  ScrollProgress,
  MorphingBlob,
  AnimatedCounter,
  WaveAnimation,
};

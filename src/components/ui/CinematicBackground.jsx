import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';

/**
 * CinematicBackground - Animated background with floating orbs and subtle gradients
 * Creates a movie-like atmospheric effect
 */
const CinematicBackground = ({ variant = 'default' }) => {
  const { resolvedTheme } = useThemeStore();
  const containerRef = useRef(null);

  // Mouse parallax effect
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      const xPercent = (clientX / innerWidth - 0.5) * 20;
      const yPercent = (clientY / innerHeight - 0.5) * 20;

      container.style.setProperty('--mouse-x', `${50 + xPercent}%`);
      container.style.setProperty('--mouse-y', `${50 + yPercent}%`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (variant === 'minimal') {
    return (
      <div 
        ref={containerRef}
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      >
        {/* Subtle gradient overlay */}
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            background: resolvedTheme === 'dark'
              ? 'radial-gradient(ellipse at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(59, 130, 246, 0.08) 0%, transparent 50%)'
              : 'radial-gradient(ellipse at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(59, 130, 246, 0.05) 0%, transparent 50%)'
          }}
        />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
    >
      {/* Primary gradient orb */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full blur-[100px]"
        style={{
          background: resolvedTheme === 'dark'
            ? 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
          top: '10%',
          left: '20%',
        }}
        animate={{
          x: [0, 30, 0],
          y: [0, 20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Secondary gradient orb */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[80px]"
        style={{
          background: resolvedTheme === 'dark'
            ? 'radial-gradient(circle, rgba(30, 58, 138, 0.2) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(30, 58, 138, 0.06) 0%, transparent 70%)',
          bottom: '20%',
          right: '10%',
        }}
        animate={{
          x: [0, -40, 0],
          y: [0, 30, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      />

      {/* Tertiary accent orb */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full blur-[60px]"
        style={{
          background: resolvedTheme === 'dark'
            ? 'radial-gradient(circle, rgba(96, 165, 250, 0.1) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(96, 165, 250, 0.05) 0%, transparent 70%)',
          top: '50%',
          right: '30%',
        }}
        animate={{
          x: [0, 20, -20, 0],
          y: [0, -30, 10, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 4,
        }}
      />

      {/* Grid pattern overlay (subtle) */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Vignette effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: resolvedTheme === 'dark'
            ? 'radial-gradient(ellipse at center, transparent 0%, rgba(15, 23, 42, 0.4) 100%)'
            : 'radial-gradient(ellipse at center, transparent 0%, rgba(248, 250, 252, 0.3) 100%)'
        }}
      />

      {/* Noise texture overlay for film grain effect */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        }}
      />
    </div>
  );
};

/**
 * FloatingElements - Decorative floating shapes
 */
export const FloatingElements = () => {
  const { resolvedTheme } = useThemeStore();
  
  const elements = [
    { size: 12, x: '10%', y: '20%', delay: 0 },
    { size: 8, x: '85%', y: '15%', delay: 1 },
    { size: 10, x: '70%', y: '70%', delay: 2 },
    { size: 6, x: '20%', y: '80%', delay: 3 },
    { size: 14, x: '90%', y: '50%', delay: 4 },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {elements.map((el, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: el.size,
            height: el.size,
            left: el.x,
            top: el.y,
            background: resolvedTheme === 'dark'
              ? 'rgba(96, 165, 250, 0.3)'
              : 'rgba(59, 130, 246, 0.2)',
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 5 + i,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: el.delay,
          }}
        />
      ))}
    </div>
  );
};

export default CinematicBackground;

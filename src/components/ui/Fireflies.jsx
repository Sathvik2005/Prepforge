import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useThemeStore } from '../../store/themeStore';

const Fireflies = ({ count = 30, className = '' }) => {
  const containerRef = useRef(null);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear existing fireflies
    container.innerHTML = '';

    // Create fireflies
    const fireflies = [];
    for (let i = 0; i < count; i++) {
      const firefly = document.createElement('div');
      firefly.className = 'firefly';
      
      // Random starting position
      const startX = Math.random() * 100;
      const startY = Math.random() * 100 + 100; // Start below viewport
      
      // Size variation (smaller = more distant feel)
      const size = Math.random() * 4 + 2;
      
      // Color based on theme - Royal Blue tones
      const colors = isDark 
        ? ['rgba(59, 130, 246, 0.8)', 'rgba(37, 99, 235, 0.7)', 'rgba(96, 165, 250, 0.6)', 'rgba(147, 197, 253, 0.5)']
        : ['rgba(37, 99, 235, 0.6)', 'rgba(59, 130, 246, 0.5)', 'rgba(29, 78, 216, 0.4)', 'rgba(96, 165, 250, 0.5)'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      firefly.style.cssText = `
        position: absolute;
        left: ${startX}%;
        top: ${startY}%;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        pointer-events: none;
        box-shadow: 0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color};
        opacity: 0;
      `;
      
      container.appendChild(firefly);
      fireflies.push(firefly);
    }

    // Animate each firefly
    fireflies.forEach((firefly, index) => {
      const duration = Math.random() * 8 + 6; // 6-14 seconds
      const delay = Math.random() * 5; // Random delay
      const drift = Math.random() * 100 - 50; // Horizontal drift
      
      // Create timeline for each firefly
      const tl = gsap.timeline({
        repeat: -1,
        delay: delay,
      });

      tl.to(firefly, {
        opacity: Math.random() * 0.6 + 0.3,
        duration: 0.5,
        ease: 'power1.in',
      })
      .to(firefly, {
        y: `-=${Math.random() * 600 + 400}`,
        x: `+=${drift}`,
        duration: duration,
        ease: 'none',
      }, '<')
      .to(firefly, {
        opacity: 0,
        duration: 1,
        ease: 'power1.out',
      }, `-=1.5`)
      .set(firefly, {
        y: 0,
        x: 0,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 30 + 100}%`,
      });

      // Add subtle pulsing glow
      gsap.to(firefly, {
        boxShadow: `0 0 ${parseFloat(firefly.style.width) * 3}px ${firefly.style.background}, 0 0 ${parseFloat(firefly.style.width) * 6}px ${firefly.style.background}`,
        duration: Math.random() * 1 + 0.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    });

    return () => {
      fireflies.forEach(firefly => {
        gsap.killTweensOf(firefly);
      });
    };
  }, [count, isDark, theme]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    />
  );
};

export default Fireflies;

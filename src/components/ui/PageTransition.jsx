import { motion } from 'framer-motion';

// Cinematic page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    filter: 'blur(4px)',
  },
  enter: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1],
      when: 'beforeChildren',
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    filter: 'blur(4px)',
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 1, 1],
    },
  },
};

// Child element variants for stagger effect
const itemVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

// Fade only variant
const fadeVariants = {
  initial: { opacity: 0 },
  enter: {
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3, ease: 'easeIn' },
  },
};

// Scale up variant
const scaleVariants = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  enter: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.3,
    },
  },
};

// Slide variants
const slideUpVariants = {
  initial: {
    opacity: 0,
    y: 40,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.4,
    },
  },
};

/**
 * PageTransition - Wraps page content with cinematic animations
 * @param {object} props
 * @param {React.ReactNode} props.children - Page content
 * @param {string} props.variant - Animation variant: 'default' | 'fade' | 'scale' | 'slideUp'
 * @param {string} props.className - Additional CSS classes
 */
const PageTransition = ({ 
  children, 
  variant = 'default',
  className = '' 
}) => {
  const variants = {
    default: pageVariants,
    fade: fadeVariants,
    scale: scaleVariants,
    slideUp: slideUpVariants,
  };

  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={variants[variant] || pageVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * AnimatedItem - For use inside PageTransition for staggered children
 */
export const AnimatedItem = ({ 
  children, 
  className = '',
  as = 'div',
  ...props 
}) => {
  const Component = motion[as] || motion.div;
  
  return (
    <Component
      variants={itemVariants}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
};

/**
 * FadeIn - Simple fade in on scroll/viewport
 */
export const FadeIn = ({ 
  children, 
  delay = 0,
  duration = 0.5,
  className = '',
  direction = 'up', // 'up' | 'down' | 'left' | 'right' | 'none'
  distance = 20,
  ...props 
}) => {
  const directions = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
    none: {},
  };

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        ...directions[direction] 
      }}
      whileInView={{ 
        opacity: 1, 
        x: 0, 
        y: 0 
      }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ 
        duration, 
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * StaggerContainer - Container that staggers children animations
 */
export const StaggerContainer = ({ 
  children, 
  className = '',
  staggerDelay = 0.1,
  ...props 
}) => {
  return (
    <motion.div
      initial="initial"
      whileInView="enter"
      viewport={{ once: true, margin: '-50px' }}
      variants={{
        initial: {},
        enter: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * HoverScale - Element that scales on hover
 */
export const HoverScale = ({ 
  children, 
  scale = 1.02,
  className = '',
  ...props 
}) => {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * ParallaxScroll - Element with parallax effect on scroll
 */
export const ParallaxScroll = ({ 
  children, 
  speed = 0.5, // 0 = no effect, 1 = full speed
  className = '',
  ...props 
}) => {
  return (
    <motion.div
      initial={{ y: 0 }}
      style={{ y: 0 }}
      whileInView={{ y: 0 }}
      viewport={{ once: false }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;

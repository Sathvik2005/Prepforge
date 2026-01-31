import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { useState } from 'react';

const ThemeToggle = ({ variant = 'default' }) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useThemeStore();
  const [showMenu, setShowMenu] = useState(false);

  // Simple toggle button
  if (variant === 'simple') {
    return (
      <motion.button
        onClick={toggleTheme}
        className="relative p-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-royal-400 dark:hover:border-royal-500 transition-all duration-300 overflow-hidden group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Toggle theme"
      >
        {/* Animated background glow */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: resolvedTheme === 'dark' 
              ? 'radial-gradient(circle at center, rgba(251, 191, 36, 0.15) 0%, transparent 70%)'
              : 'radial-gradient(circle at center, rgba(59, 130, 246, 0.15) 0%, transparent 70%)'
          }}
        />
        
        <div className="relative w-5 h-5">
          <AnimatePresence mode="wait">
            {resolvedTheme === 'dark' ? (
              <motion.div
                key="sun"
                initial={{ rotate: -90, scale: 0, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 90, scale: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <Sun className="w-5 h-5 text-amber-500" />
              </motion.div>
            ) : (
              <motion.div
                key="moon"
                initial={{ rotate: 90, scale: 0, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: -90, scale: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <Moon className="w-5 h-5 text-royal-600" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Ripple effect on click */}
        <motion.span
          className="absolute inset-0 rounded-xl"
          initial={false}
          whileTap={{
            boxShadow: resolvedTheme === 'dark'
              ? '0 0 0 4px rgba(251, 191, 36, 0.2)'
              : '0 0 0 4px rgba(59, 130, 246, 0.2)',
          }}
          transition={{ duration: 0.2 }}
        />
      </motion.button>
    );
  }

  // Full toggle with dropdown
  return (
    <div className="relative">
      <motion.button
        onClick={() => setShowMenu(!showMenu)}
        className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-royal-400 dark:hover:border-royal-500 transition-all duration-300"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="relative w-5 h-5">
          <AnimatePresence mode="wait">
            {resolvedTheme === 'dark' ? (
              <motion.div
                key="moon-icon"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Moon className="w-5 h-5 text-royal-400" />
              </motion.div>
            ) : (
              <motion.div
                key="sun-icon"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Sun className="w-5 h-5 text-amber-500" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <span className="text-sm font-medium text-surface-600 dark:text-surface-300 capitalize hidden sm:inline">
          {theme}
        </span>
      </motion.button>

      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            
            {/* Dropdown menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute right-0 mt-2 w-40 py-2 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-soft-lg dark:shadow-soft-dark-lg z-50 overflow-hidden"
            >
              {[
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'system', icon: Monitor, label: 'System' },
              ].map((option) => (
                <motion.button
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value);
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200 ${
                    theme === option.value
                      ? 'bg-royal-50 dark:bg-royal-900/30 text-royal-600 dark:text-royal-400'
                      : 'text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700'
                  }`}
                  whileHover={{ x: 4 }}
                >
                  <option.icon className="w-4 h-4" />
                  <span>{option.label}</span>
                  {theme === option.value && (
                    <motion.div
                      layoutId="theme-indicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-royal-500"
                    />
                  )}
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeToggle;

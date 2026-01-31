import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

/**
 * Anti-Cheat Hook for Mock Interviews
 * Detects:
 * - Tab switching
 * - Window focus loss
 * - Browser extensions (developer tools, screen capture, etc.)
 * - Copy/Paste attempts
 * - Right-click disabled
 */
export const useAntiCheat = ({ onViolation, enableExtensionDetection = true }) => {
  const [violations, setViolations] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [suspiciousActivity, setSuspiciousActivity] = useState(false);
  const violationTimeoutRef = useRef(null);

  // Track tab switches and window blur events
  useEffect(() => {
    if (!isMonitoring) return;

    let tabSwitchWarningShown = false;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const violation = {
          type: 'TAB_SWITCH',
          timestamp: new Date().toISOString(),
          message: 'User switched tabs or minimized window',
        };

        setTabSwitchCount((prev) => {
          const newCount = prev + 1;
          
          if (newCount === 1) {
            toast.error('⚠️ Warning: Tab switching detected!', {
              duration: 4000,
              icon: '🚨',
            });
          } else if (newCount === 2) {
            toast.error('⚠️ Second warning: Please stay focused on the interview!', {
              duration: 5000,
              icon: '🚨',
            });
          } else if (newCount >= 3) {
            toast.error('🚫 Multiple tab switches detected! Interview may be invalidated.', {
              duration: 6000,
              icon: '⛔',
            });
            setSuspiciousActivity(true);
          }

          return newCount;
        });

        setViolations((prev) => [...prev, violation]);
        onViolation?.(violation);

        // Log to console for debugging
        console.warn('🚨 TAB SWITCH DETECTED:', violation);
      }
    };

    const handleBlur = () => {
      const violation = {
        type: 'WINDOW_BLUR',
        timestamp: new Date().toISOString(),
        message: 'Window lost focus',
      };
      
      setViolations((prev) => [...prev, violation]);
      onViolation?.(violation);
      
      if (!tabSwitchWarningShown) {
        toast.error('⚠️ Please keep the interview window focused', {
          duration: 3000,
        });
        tabSwitchWarningShown = true;
        setTimeout(() => {
          tabSwitchWarningShown = false;
        }, 5000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isMonitoring, onViolation]);

  // Detect browser extensions and developer tools
  useEffect(() => {
    if (!isMonitoring || !enableExtensionDetection) return;

    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;

      if (widthThreshold || heightThreshold) {
        const violation = {
          type: 'DEVTOOLS_OPEN',
          timestamp: new Date().toISOString(),
          message: 'Developer tools detected',
        };

        setViolations((prev) => {
          // Avoid duplicate violations
          const lastViolation = prev[prev.length - 1];
          if (lastViolation?.type === 'DEVTOOLS_OPEN' && 
              Date.now() - new Date(lastViolation.timestamp).getTime() < 5000) {
            return prev;
          }
          return [...prev, violation];
        });

        toast.error('🚫 Developer tools detected! This is not allowed during interviews.', {
          duration: 5000,
          icon: '⛔',
        });

        setSuspiciousActivity(true);
        onViolation?.(violation);
      }
    };

    // Check for common extension APIs
    const detectExtensions = () => {
      const suspiciousAPIs = [
        window.chrome?.runtime,
        window.browser?.runtime,
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
        window.__REDUX_DEVTOOLS_EXTENSION__,
      ];

      const detected = suspiciousAPIs.filter(Boolean);
      
      if (detected.length > 2) {
        const violation = {
          type: 'EXTENSIONS_DETECTED',
          timestamp: new Date().toISOString(),
          message: `Multiple browser extensions detected (${detected.length})`,
        };

        setViolations((prev) => [...prev, violation]);
        
        toast.error('⚠️ Multiple browser extensions detected. Some may interfere with the interview.', {
          duration: 4000,
        });

        onViolation?.(violation);
      }
    };

    const interval = setInterval(() => {
      detectDevTools();
      detectExtensions();
    }, 3000);

    return () => clearInterval(interval);
  }, [isMonitoring, enableExtensionDetection, onViolation]);

  // Prevent copy/paste
  useEffect(() => {
    if (!isMonitoring) return;

    const preventCopy = (e) => {
      e.preventDefault();
      toast.error('⚠️ Copy is disabled during the interview', {
        duration: 2000,
      });

      const violation = {
        type: 'COPY_ATTEMPT',
        timestamp: new Date().toISOString(),
        message: 'User attempted to copy content',
      };

      setViolations((prev) => [...prev, violation]);
      onViolation?.(violation);
    };

    const preventPaste = (e) => {
      // Allow paste in code editor areas
      if (e.target.classList.contains('monaco-editor') || 
          e.target.closest('.code-editor-area')) {
        return;
      }

      e.preventDefault();
      toast.error('⚠️ Paste is disabled during the interview', {
        duration: 2000,
      });

      const violation = {
        type: 'PASTE_ATTEMPT',
        timestamp: new Date().toISOString(),
        message: 'User attempted to paste content',
      };

      setViolations((prev) => [...prev, violation]);
      onViolation?.(violation);
    };

    const preventCut = (e) => {
      e.preventDefault();
      toast.error('⚠️ Cut is disabled during the interview', {
        duration: 2000,
      });
    };

    document.addEventListener('copy', preventCopy);
    document.addEventListener('paste', preventPaste);
    document.addEventListener('cut', preventCut);

    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('paste', preventPaste);
      document.removeEventListener('cut', preventCut);
    };
  }, [isMonitoring, onViolation]);

  // Prevent right-click context menu
  useEffect(() => {
    if (!isMonitoring) return;

    const preventContextMenu = (e) => {
      e.preventDefault();
      toast.error('⚠️ Right-click is disabled during the interview', {
        duration: 2000,
      });

      const violation = {
        type: 'CONTEXT_MENU_ATTEMPT',
        timestamp: new Date().toISOString(),
        message: 'User attempted to open context menu',
      };

      setViolations((prev) => [...prev, violation]);
      onViolation?.(violation);

      return false;
    };

    document.addEventListener('contextmenu', preventContextMenu);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [isMonitoring, onViolation]);

  // Detect keyboard shortcuts (Ctrl+C, Ctrl+V, etc.)
  useEffect(() => {
    if (!isMonitoring) return;

    const handleKeyDown = (e) => {
      // Detect common cheating shortcuts
      const isCopy = (e.ctrlKey || e.metaKey) && e.key === 'c';
      const isPaste = (e.ctrlKey || e.metaKey) && e.key === 'v';
      const isSelectAll = (e.ctrlKey || e.metaKey) && e.key === 'a';
      const isPrint = (e.ctrlKey || e.metaKey) && e.key === 'p';
      const isDevTools = 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J')) ||
        e.key === 'F12';

      if (isDevTools) {
        e.preventDefault();
        toast.error('🚫 Developer tools are not allowed during the interview', {
          duration: 3000,
        });

        const violation = {
          type: 'DEVTOOLS_SHORTCUT',
          timestamp: new Date().toISOString(),
          message: 'User attempted to open developer tools',
        };

        setViolations((prev) => [...prev, violation]);
        setSuspiciousActivity(true);
        onViolation?.(violation);
      }

      if (isPrint) {
        e.preventDefault();
        toast.error('⚠️ Printing is disabled during the interview', {
          duration: 2000,
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMonitoring, onViolation]);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    setViolations([]);
    setTabSwitchCount(0);
    setSuspiciousActivity(false);
    
    toast.success('🔒 Anti-cheat monitoring activated', {
      duration: 3000,
      icon: '🛡️',
    });

    console.log('🛡️ Anti-cheat system activated');
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    
    console.log('🛡️ Anti-cheat system deactivated');
    console.log('📊 Final violations:', violations);
  }, [violations]);

  const getViolationSummary = useCallback(() => {
    const summary = {
      total: violations.length,
      byType: {},
      suspiciousActivity,
      tabSwitchCount,
    };

    violations.forEach((v) => {
      summary.byType[v.type] = (summary.byType[v.type] || 0) + 1;
    });

    return summary;
  }, [violations, suspiciousActivity, tabSwitchCount]);

  return {
    isMonitoring,
    violations,
    tabSwitchCount,
    suspiciousActivity,
    startMonitoring,
    stopMonitoring,
    getViolationSummary,
  };
};

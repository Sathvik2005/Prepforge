/**
 * Toast Notification Manager
 * Centralized toast notification utilities with consistent styling
 */

import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react';

const toastConfig = {
  duration: 4000,
  position: 'top-right',
  style: {
    borderRadius: '12px',
    padding: '16px',
    fontSize: '14px',
  },
};

/**
 * Success notification
 */
export const showSuccess = (message, options = {}) => {
  return toast.success(message, {
    ...toastConfig,
    icon: <CheckCircle2 className="w-5 h-5" />,
    style: {
      ...toastConfig.style,
      background: '#10b981',
      color: '#fff',
    },
    ...options,
  });
};

/**
 * Error notification
 */
export const showError = (message, options = {}) => {
  return toast.error(message, {
    ...toastConfig,
    duration: 5000, // Errors stay longer
    icon: <XCircle className="w-5 h-5" />,
    style: {
      ...toastConfig.style,
      background: '#ef4444',
      color: '#fff',
    },
    ...options,
  });
};

/**
 * Warning notification
 */
export const showWarning = (message, options = {}) => {
  return toast(message, {
    ...toastConfig,
    icon: <AlertCircle className="w-5 h-5" />,
    style: {
      ...toastConfig.style,
      background: '#f59e0b',
      color: '#fff',
    },
    ...options,
  });
};

/**
 * Info notification
 */
export const showInfo = (message, options = {}) => {
  return toast(message, {
    ...toastConfig,
    icon: <Info className="w-5 h-5" />,
    style: {
      ...toastConfig.style,
      background: '#3b82f6',
      color: '#fff',
    },
    ...options,
  });
};

/**
 * Loading notification
 */
export const showLoading = (message, options = {}) => {
  return toast.loading(message, {
    ...toastConfig,
    duration: Infinity, // Loading stays until dismissed
    icon: <Loader2 className="w-5 h-5 animate-spin" />,
    style: {
      ...toastConfig.style,
      background: '#6b7280',
      color: '#fff',
    },
    ...options,
  });
};

/**
 * Promise-based notification
 * Automatically shows loading, success, and error states
 */
export const showPromise = (promise, messages = {}) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading || 'Processing...',
      success: messages.success || 'Success!',
      error: (err) => messages.error || err?.message || 'Something went wrong',
    },
    {
      ...toastConfig,
      success: {
        icon: <CheckCircle2 className="w-5 h-5" />,
        style: {
          ...toastConfig.style,
          background: '#10b981',
          color: '#fff',
        },
      },
      error: {
        icon: <XCircle className="w-5 h-5" />,
        style: {
          ...toastConfig.style,
          background: '#ef4444',
          color: '#fff',
        },
        duration: 5000,
      },
      loading: {
        icon: <Loader2 className="w-5 h-5 animate-spin" />,
        style: {
          ...toastConfig.style,
          background: '#6b7280',
          color: '#fff',
        },
      },
    }
  );
};

/**
 * Dismiss a specific toast or all toasts
 */
export const dismissToast = (toastId) => {
  if (toastId) {
    toast.dismiss(toastId);
  } else {
    toast.dismiss();
  }
};

/**
 * Show API error with better formatting
 */
export const showApiError = (error, fallbackMessage = 'An error occurred') => {
  let message = fallbackMessage;
  
  if (error?.response?.data?.message) {
    message = error.response.data.message;
  } else if (error?.response?.data?.error) {
    message = error.response.data.error;
  } else if (error?.message) {
    message = error.message;
  }
  
  // Handle specific status codes
  if (error?.response?.status === 429) {
    message = 'Too many requests. Please try again later.';
  } else if (error?.response?.status === 401) {
    message = 'Please log in to continue.';
  } else if (error?.response?.status === 403) {
    message = 'You do not have permission to perform this action.';
  } else if (error?.response?.status === 404) {
    message = 'Resource not found.';
  } else if (error?.response?.status >= 500) {
    message = 'Server error. Please try again later.';
  }
  
  return showError(message);
};

export default {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  promise: showPromise,
  apiError: showApiError,
  dismiss: dismissToast,
};

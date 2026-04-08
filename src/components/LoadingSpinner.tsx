import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

// Delete Confirmation Modal Component
interface DeleteConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title = "Delete Post",
  message = "Are you sure you want to delete this post? This action cannot be undone."
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 relative">
                <button
                  onClick={onCancel}
                  className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">{title}</h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-700 leading-relaxed">{message}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 px-6 pb-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onCancel}
                  className="px-5 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onConfirm}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                >
                  Delete Post
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

// Prevent default browser spinners
function disableDefaultSpinners() {
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
      /* Disable number input spinners */
      input[type="number"]::-webkit-inner-spin-button,
      input[type="number"]::-webkit-outer-spin-button,
      input[type="number"] {
        -webkit-appearance: none;
        margin: 0;
        -moz-appearance: textfield;
      }
      .no-spinner::-webkit-inner-spin-button,
      .no-spinner::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      
      /* Loading spinner animations */
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 0.6; transform: scale(0.95); }
        50% { opacity: 1; transform: scale(1.05); }
      }
      
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
    `;
    document.head.appendChild(style);
  }
}

disableDefaultSpinners();

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  className?: string;
  fullScreen?: boolean;
  message?: string;
}

const sizeClasses: Record<SpinnerSize, { container: string; dot: string }> = {
  xs: { container: 'w-8 h-8', dot: 'w-1.5 h-1.5' },
  sm: { container: 'w-12 h-12', dot: 'w-2 h-2' },
  md: { container: 'w-16 h-16', dot: 'w-2.5 h-2.5' },
  lg: { container: 'w-20 h-20', dot: 'w-3 h-3' },
  xl: { container: 'w-24 h-24', dot: 'w-3.5 h-3.5' },
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  fullScreen = true,
  message = 'Loading...',
}) => {
  // Ensure the size is valid, fallback to 'md' if not
  const validSize = size in sizeClasses ? size as SpinnerSize : 'md';
  const { container: containerSize, dot: dotSize } = sizeClasses[validSize];

  // Add overflow hidden immediately if in fullscreen mode
  if (fullScreen && typeof document !== 'undefined') {
    document.body.classList.add('overflow-hidden');
  }

  useEffect(() => {
    // Cleanup function to remove overflow hidden when component unmounts
    return () => {
      if (fullScreen && typeof document !== 'undefined') {
        document.body.classList.remove('overflow-hidden');
      }
    };
  }, [fullScreen]);

  const spinnerContent = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className={`relative ${containerSize}`}>
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <motion.img
          src="/AvatarImages/TherapAILogo.png"
          alt=""
          className="absolute inset-1 w-[calc(100%-0.5rem)] h-[calc(100%-0.5rem)] object-contain"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: 'loop',
          }}
          aria-hidden="true"
        />
      </div>

      <div className="flex items-center space-x-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`bg-teal-600 rounded-full ${dotSize}`}
            animate={{
              y: [0, -8, 0],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {message && (
        <motion.p 
          className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );

  // For full screen, use a separate component to ensure immediate rendering
  if (fullScreen) {
    return (
      <FullScreenSpinner 
        className={className}
        message={message}
      >
        {spinnerContent}
      </FullScreenSpinner>
    );
  }

  // For inline spinners
  return spinnerContent;
};

// Separate component for fullscreen spinner to ensure immediate rendering
const FullScreenSpinner: React.FC<{
  className?: string;
  message: string;
  children: React.ReactNode;
}> = ({ className, message, children }) => {
  // Apply styles directly to ensure they take effect immediately
  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-[9999] bg-white ${className || ''}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: 0,
        overflow: 'hidden'
      }}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {children}
    </div>
  );
};

export default LoadingSpinner;
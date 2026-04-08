import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';
import { useNotificationStore } from '@/stores/notificationStore';

const icons = {
  success: <CheckCircle size={18} className="text-[#1A6B5C]" />,
  warning: <AlertCircle size={18} className="text-[#D97706]" />,
  error: <XCircle size={18} className="text-[#DC2626]" />,
  info: <Info size={18} className="text-[#1D9E75]" />,
};

const borderColors = {
  success: 'border-l-[#1A6B5C]',
  warning: 'border-l-[#D97706]',
  error: 'border-l-[#DC2626]',
  info: 'border-l-[#1D9E75]',
};

interface ToastItemProps {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  duration?: number;
}

const ToastItem: React.FC<ToastItemProps> = ({ id, type, message, duration = 5000 }) => {
  const removeToast = useNotificationStore(s => s.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, removeToast]);

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      className={`flex items-start gap-3 bg-white rounded-xl border border-[#D6F0E8] border-l-4 ${borderColors[type]} shadow-lg p-4 min-w-[280px] max-w-sm`}
    >
      <span className="shrink-0 mt-0.5">{icons[type]}</span>
      <p className="flex-1 text-sm text-[#0D4035]">{message}</p>
      <button onClick={() => removeToast(id)} className="shrink-0 text-[#64748B] hover:text-[#0D4035]">
        <X size={16} />
      </button>
    </motion.div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useNotificationStore(s => s.toasts);
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem {...t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

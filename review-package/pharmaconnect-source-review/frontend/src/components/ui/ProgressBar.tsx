import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number; // 0-100
  color?: 'teal' | 'amber' | 'coral';
  label?: string;
  showPercent?: boolean;
  height?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colorStyles = {
  teal: 'bg-[#1A6B5C]',
  amber: 'bg-[#D97706]',
  coral: 'bg-[#DC2626]',
};

const heightStyles = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value, color = 'teal', label, showPercent = false, height = 'md', className = ''
}) => {
  const clamped = Math.min(100, Math.max(0, value));
  const barColor = clamped >= 80 ? 'teal' : clamped >= 50 ? 'amber' : 'coral';
  const usedColor = color !== 'teal' ? color : barColor;

  return (
    <div className={className}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm text-[#64748B]">{label}</span>}
          {showPercent && <span className="text-sm font-medium text-[#0D4035]">{clamped}%</span>}
        </div>
      )}
      <div className={`w-full bg-[#D6F0E8] rounded-full overflow-hidden ${heightStyles[height]}`}>
        <motion.div
          className={`h-full rounded-full ${colorStyles[usedColor]}`}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

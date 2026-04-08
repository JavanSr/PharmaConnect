import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'sponsored' | 'purple' | 'coral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-[#D6F0E8] text-[#1A6B5C] border border-[#1A6B5C]/20',
  warning: 'bg-amber-50 text-[#D97706] border border-amber-200',
  danger: 'bg-red-50 text-[#DC2626] border border-red-200',
  info: 'bg-[#D6F0E8] text-[#1D9E75] border border-[#1D9E75]/20',
  muted: 'bg-gray-100 text-[#64748B] border border-gray-200',
  sponsored: 'bg-amber-50 text-[#D97706] border border-amber-300 uppercase tracking-wide',
  purple: 'bg-purple-50 text-[#6D28D9] border border-purple-200',
  coral: 'bg-red-50 text-[#DC2626] border border-red-200',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'info', size = 'md', children, className = '' }) => {
  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-full ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  );
};

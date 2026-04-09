import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-[#1A6B5C] text-white hover:bg-[#145748] active:bg-[#145748] disabled:bg-[#1A6B5C]/40',
  secondary: 'border border-[#1A6B5C] text-[#1A6B5C] bg-transparent hover:bg-[#D6F0E8] active:bg-[#D6F0E8]',
  danger: 'bg-[#DC2626] text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300',
  ghost: 'text-[#0D4035] bg-transparent hover:bg-[#D6F0E8] active:bg-[#D6F0E8]',
  warning: 'bg-[#D97706] text-white hover:bg-amber-700 active:bg-amber-800 disabled:bg-amber-300',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, leftIcon, rightIcon, children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1A6B5C] focus:ring-offset-2 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin shrink-0" size={size === 'lg' ? 20 : 16} /> : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);
Button.displayName = 'Button';

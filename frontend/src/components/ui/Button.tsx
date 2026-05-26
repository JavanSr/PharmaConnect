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
  primary: 'bg-primary-container text-on-primary hover:opacity-90 active:scale-[0.98] disabled:bg-primary-container/40',
  secondary: 'border border-primary text-primary bg-transparent hover:bg-secondary-container/50 active:bg-secondary-container/60',
  danger: 'bg-error text-on-error hover:opacity-90 active:scale-[0.98] disabled:bg-error/40',
  ghost: 'text-on-surface bg-transparent hover:bg-surface-variant active:bg-surface-container-high',
  warning: 'bg-tertiary-container text-on-tertiary hover:opacity-90 active:scale-[0.98] disabled:bg-tertiary-container/40',
};

const sizeStyles: Record<Size, string> = {
  sm: 'min-h-[40px] px-4 text-label-lg rounded-full gap-1.5',
  md: 'min-h-touch-target-min px-5 text-label-lg rounded-full gap-2',
  lg: 'min-h-[56px] px-6 text-title-md rounded-full gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, leftIcon, rightIcon, children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
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

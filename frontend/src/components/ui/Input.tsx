import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="flex flex-col gap-1">
        <div className="relative">
          {label && (
            <label htmlFor={inputId} className="absolute -top-2 left-3 z-10 bg-surface px-1 text-label-md text-primary">
              {label}
              {props.required && <span className="text-error ml-0.5">*</span>}
            </label>
          )}
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full h-[56px] px-3 text-body-lg text-on-surface bg-transparent border rounded-lg outline-none transition-all placeholder:text-outline-variant
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${error
                ? 'border-error focus:ring-2 focus:ring-error/20'
                : 'border-outline focus:border-primary focus:ring-1 focus:ring-primary'
              }
              disabled:bg-surface-container disabled:text-on-surface-variant disabled:cursor-not-allowed
              ${className}`}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-error mt-0.5">{error}</p>}
        {hint && !error && <p className="text-xs text-on-surface-variant mt-0.5">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

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
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[#0D4035]">
            {label}
            {props.required && <span className="text-[#DC2626] ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full h-10 px-3 text-sm text-[#0D4035] bg-white border rounded-xl outline-none transition-all
              ${leftIcon ? 'pl-9' : ''}
              ${rightIcon ? 'pr-9' : ''}
              ${error
                ? 'border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20'
                : 'border-[#D6F0E8] focus:border-[#1A6B5C] focus:ring-2 focus:ring-[#1A6B5C]/20'
              }
              disabled:bg-gray-50 disabled:text-[#64748B] disabled:cursor-not-allowed
              ${className}`}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-[#DC2626] mt-0.5">{error}</p>}
        {hint && !error && <p className="text-xs text-[#64748B] mt-0.5">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

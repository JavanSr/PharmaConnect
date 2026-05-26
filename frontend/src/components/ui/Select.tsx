import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption { value: string; label: string; }

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="flex flex-col gap-1">
        <div className="relative">
          {label && (
            <label htmlFor={selectId} className="absolute -top-2 left-3 z-10 bg-surface px-1 text-label-md text-primary">
              {label}
              {props.required && <span className="text-error ml-0.5">*</span>}
            </label>
          )}
          <select
            ref={ref}
            id={selectId}
            className={`w-full h-[56px] pl-3 pr-9 text-body-lg text-on-surface bg-transparent border rounded-lg outline-none appearance-none transition-all
              ${error ? 'border-error focus:ring-2 focus:ring-error/20' : 'border-outline focus:border-primary focus:ring-1 focus:ring-primary'}
              disabled:bg-surface-container disabled:cursor-not-allowed ${className}`}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
        </div>
        {error && <p className="text-xs text-error mt-0.5">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

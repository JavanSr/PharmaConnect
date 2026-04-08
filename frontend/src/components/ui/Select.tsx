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
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-[#0D4035]">
            {label}
            {props.required && <span className="text-[#DC2626] ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`w-full h-10 pl-3 pr-9 text-sm text-[#0D4035] bg-white border rounded-xl outline-none appearance-none transition-all
              ${error ? 'border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20' : 'border-[#D6F0E8] focus:border-[#1A6B5C] focus:ring-2 focus:ring-[#1A6B5C]/20'}
              disabled:bg-gray-50 disabled:cursor-not-allowed ${className}`}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
        </div>
        {error && <p className="text-xs text-[#DC2626] mt-0.5">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  shadow?: 'none' | 'sm' | 'md';
  padding?: boolean;
}

const shadowStyles = {
  none: '',
  sm: 'shadow-[0_1px_3px_rgba(13,64,53,0.08)]',
  md: 'shadow-[0_4px_6px_rgba(13,64,53,0.07),0_2px_4px_rgba(13,64,53,0.05)]',
};

export const Card: React.FC<CardProps> = ({ children, className = '', header, footer, shadow = 'sm', padding = true }) => {
  // If caller passes a bg-* class, don't apply the default background —
  // Tailwind resolves conflicts by CSS definition order, not HTML class order.
  const hasBg = className.split(' ').some((c) => c.startsWith('bg-'));
  return (
    <div className={`${hasBg ? '' : 'bg-surface-container-low '}rounded-xl border border-outline-variant/30 ${shadowStyles[shadow]} ${className}`}>
      {header && <div className="px-5 py-4 border-b border-outline-variant/30">{header}</div>}
      <div className={padding ? 'p-5' : ''}>{children}</div>
      {footer && <div className="px-5 py-4 border-t border-outline-variant/30 bg-surface-container rounded-b-xl">{footer}</div>}
    </div>
  );
};

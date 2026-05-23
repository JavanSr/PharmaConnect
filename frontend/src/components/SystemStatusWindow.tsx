import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type SystemStatusWindowProps = {
  type: 'loading' | 'error';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const SystemStatusWindow: React.FC<SystemStatusWindowProps> = ({
  type,
  title,
  message,
  actionLabel,
  onAction,
}) => {
  const isLoading = type === 'loading';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#EDF7F3] px-4 py-6">
      <div className="w-full max-w-md rounded-2xl border border-[#D6F0E8] bg-white p-6 text-center shadow-2xl">
        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${isLoading ? 'bg-[#D6F0E8] text-[#1A6B5C]' : 'bg-red-50 text-[#DC2626]'}`}>
          {isLoading ? <Loader2 size={24} className="animate-spin" /> : <AlertTriangle size={24} />}
        </div>
        <h1 className="mt-4 text-lg font-semibold text-[#0D4035]">{title}</h1>
        <p className="mt-2 text-sm text-[#64748B]">{message}</p>
        {!isLoading && actionLabel && onAction && (
          <div className="mt-5">
            <Button onClick={onAction}>{actionLabel}</Button>
          </div>
        )}
      </div>
    </div>
  );
};

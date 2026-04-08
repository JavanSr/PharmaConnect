import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, CheckCircle2, ArrowRight, Check, CircleDot } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

interface ComingSoonGateProps {
  phase: 2 | 3 | 4;
  moduleName: string;
  description: string;
  features: string[];
  estimatedPhase: string;
}

export const ComingSoonGate: React.FC<ComingSoonGateProps> = ({
  phase, moduleName, description, features,
}) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.post('/waitlist', { email, module: moduleName, phase });
      setSubmitted(true);
    } catch {
      setSubmitted(true); // Optimistic
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg bg-[#EDF7F3] rounded-3xl border border-[#D6F0E8] p-8"
      >
        {/* Badge */}
        <div className="flex items-center gap-2 mb-6">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#1A6B5C] text-white flex items-center gap-1.5">
            <Check size={11} />
            Coming Soon
          </span>
          <Lock size={16} className="text-[#64748B]" />
        </div>

        {/* Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-[#0D4035] font-serif mb-2">{moduleName}</h1>
          <p className="text-[#64748B]">{description}</p>
        </div>

        {/* Features */}
        <div className="mb-6 space-y-2">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <Lock size={13} className="text-[#64748B] shrink-0" />
              <span className="text-sm text-[#64748B]">{f}</span>
            </div>
          ))}
        </div>

        {/* Progress bar — Phase 1 active */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#1A6B5C] text-white flex items-center justify-center text-xs font-bold">
              <CircleDot size={14} />
            </div>
            <span className="text-xs text-[#1A6B5C] font-medium">Active</span>
          </div>
          <div className="flex-1 h-px bg-[#D6F0E8]" />
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#D6F0E8] text-[#64748B] flex items-center justify-center text-xs font-bold">
              <Lock size={12} />
            </div>
            <span className="text-xs text-[#64748B]">Upcoming</span>
          </div>
        </div>

        {/* Email capture */}
        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-sm font-medium text-[#0D4035]">Get notified when this launches:</p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1"
                required
              />
              <Button type="submit" loading={loading} rightIcon={<ArrowRight size={16} />}>
                Notify me
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-[#D6F0E8] rounded-xl border border-[#1A6B5C]/20">
            <CheckCircle2 size={18} className="text-[#1A6B5C]" />
            <p className="text-sm text-[#1A6B5C] font-medium">You're on the list! We'll notify you at {email}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

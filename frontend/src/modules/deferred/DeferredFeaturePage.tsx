import React, { useState } from 'react';
import { ArrowLeft, Clock3, Mail, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

type DeferredFeaturePageProps = {
  title: string;
  description: string;
  dependency: string;
  dependencyStatus: string;
};

export const DeferredFeaturePage: React.FC<DeferredFeaturePageProps> = ({
  title,
  description,
  dependency,
  dependencyStatus,
}) => {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setState('loading');
    try {
      await api.post('/waitlist', { email, feature: title });
      setState('done');
      setEmail('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not join the waitlist');
      setState('idle');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(42,148,120,0.16),_transparent_42%),linear-gradient(180deg,#EDF7F3_0%,#F8FAFC_100%)] px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-[#1A6B5C] hover:underline">
          <ArrowLeft size={14} />
          Back to platform
        </Link>

        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#1A6B5C]">Not available in this build</p>
          <h1 className="text-4xl font-bold text-[#0D4035]">{title}</h1>
          <p className="max-w-2xl text-base text-[#475569]">{description}</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="bg-white/90">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[#EDF7F3] p-3">
                <ShieldAlert size={20} className="text-[#1A6B5C]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0D4035]">Blocking dependency</p>
                <p className="mt-2 text-sm text-[#475569]">{dependency}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#D6F0E8] bg-[#F8FAFC] px-4 py-4">
              <div className="flex items-center gap-2">
                <Clock3 size={15} className="text-[#1A6B5C]" />
                <p className="text-sm font-semibold text-[#0D4035]">Current status</p>
              </div>
              <p className="mt-2 text-sm text-[#475569]">{dependencyStatus}</p>
            </div>
          </Card>

          <Card className="bg-white/90">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-[#1A6B5C]" />
              <p className="text-sm font-semibold text-[#0D4035]">Join the waitlist</p>
            </div>
            <p className="mt-2 text-sm text-[#64748B]">
              Leave your email and we will notify you when this feature is ready.
            </p>

            <div className="mt-4 space-y-3">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
              {error ? <p className="text-xs text-[#DC2626]">{error}</p> : null}
              {state === 'done' ? (
                <p className="text-xs text-[#1A6B5C]">You are on the waitlist.</p>
              ) : null}
              <Button
                className="w-full"
                onClick={submit}
                loading={state === 'loading'}
                disabled={!email}
              >
                Save my spot
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Package, Shield, Pill, BarChart3, BookOpen, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { Button } from '@/components/ui/Button';

const FEATURES = [
  { icon: <Pill size={16} className="text-[#1A6B5C]" />, label: 'Full dispensing workflow' },
  { icon: <Package size={16} className="text-[#1A6B5C]" />, label: 'Inventory & batch tracking (FEFO)' },
  { icon: <Shield size={16} className="text-[#1A6B5C]" />, label: 'Drug interaction & safety alerts' },
  { icon: <BarChart3 size={16} className="text-[#1A6B5C]" />, label: 'Analytics & financial reports' },
  { icon: <BookOpen size={16} className="text-[#1A6B5C]" />, label: 'Knowledge Hub & TMDA updates' },
  { icon: <CheckCircle size={16} className="text-[#1A6B5C]" />, label: 'Compliance tracker & staff credentials' },
];

export const TrialConfirmPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const pharmacy = usePharmacyStore(s => s.pharmacy);

  return (
    <div className="min-h-screen bg-[#EDF7F3] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src="/brand/pharmaconnect-logo.svg" alt="APOTEKH" className="h-10 w-auto" />
        </div>

        <div className="bg-white rounded-2xl border border-[#D6F0E8] shadow-sm p-8">
          {/* Hero */}
          <div className="text-center mb-7">
            <div className="w-16 h-16 rounded-2xl bg-[#D6F0E8] flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={30} className="text-[#1A6B5C]" />
            </div>
            <h1 className="text-xl font-bold text-[#0D4035] mb-1">
              Welcome, {user?.firstName ?? 'there'}!
            </h1>
            <p className="text-sm text-[#64748B]">
              {pharmacy?.name ?? 'Your pharmacy'} is now on APOTEKH.
            </p>
          </div>

          {/* Trial badge */}
          <div className="bg-gradient-to-r from-[#D6F0E8] to-[#EDF7F3] rounded-xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#1A6B5C] uppercase tracking-wide">Free trial</p>
              <p className="text-2xl font-bold text-[#0D4035]">14 days</p>
              <p className="text-xs text-[#64748B]">No credit card required</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#64748B]">Plan</p>
              <p className="text-sm font-bold text-[#0D4035]">{pharmacy?.subscriptionTier ?? 'STANDARD'}</p>
              <p className="text-xs text-[#64748B]">Full access</p>
            </div>
          </div>

          {/* Feature list */}
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-3">Everything included</p>
          <div className="space-y-2 mb-7">
            {FEATURES.map(f => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#EDF7F3] flex items-center justify-center shrink-0">
                  {f.icon}
                </div>
                <span className="text-sm text-[#374151]">{f.label}</span>
              </div>
            ))}
          </div>

          <Button className="w-full" size="lg" onClick={() => navigate('/dashboard', { replace: true })}>
            Start using APOTEKH <ArrowRight size={16} className="ml-2" />
          </Button>

          <p className="text-center text-xs text-[#94A3B8] mt-4">
            Questions? Email us at{' '}
            <a href="mailto:info@apotekh.co.tz" className="text-[#1A6B5C]">info@apotekh.co.tz</a>
          </p>
        </div>

        <p className="text-center text-xs text-[#64748B] mt-4">
          TMDA-ready pharmacy operations
        </p>
      </div>
    </div>
  );
};

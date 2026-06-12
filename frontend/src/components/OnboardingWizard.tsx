import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Users, ChevronRight, CheckCircle, Plus, Eye, EyeOff,
  X, Building2, Shield, UserCheck, Pill, ClipboardList,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type Role =
  | 'PHARMACIST_IN_CHARGE'
  | 'DISPENSER'
  | 'CASHIER'
  | 'DATA_ENTRY_CLERK';

interface TeamMember {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  tempPassword: string;
}

type Step = 'welcome' | 'team' | 'done';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLES: { value: Role; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'PHARMACIST_IN_CHARGE',
    label: 'Pharmacist in Charge (PIC)',
    description: 'Full clinical + operational control. Required for licensed pharmacies.',
    icon: <Shield size={16} className="text-blue-600" />,
  },
  {
    value: 'DISPENSER',
    label: 'Dispenser / ADDO Operator',
    description: 'Day-to-day dispensing, stock intake, and patient safety tools.',
    icon: <Pill size={16} className="text-pc-600" />,
  },
  {
    value: 'CASHIER',
    label: 'Cashier',
    description: 'Completes payment on prepared sales. No dispensing access.',
    icon: <UserCheck size={16} className="text-amber-600" />,
  },
  {
    value: 'DATA_ENTRY_CLERK',
    label: 'Data Entry Clerk',
    description: 'Stock intake and supplier management only.',
    icon: <ClipboardList size={16} className="text-slate-500" />,
  },
];

function generatePassword(): string {
  const words = ['Dawa', 'Afya', 'Salama', 'Mzuri', 'Haraka'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${word}${num}!`;
}

const emptyMember = (): TeamMember => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'DISPENSER',
  tempPassword: generatePassword(),
});

// ─── Sub-components ───────────────────────────────────────────────────────────

const StepDot = ({ active, done }: { active: boolean; done: boolean }) => (
  <div
    className={`w-2.5 h-2.5 rounded-full transition-colors ${
      done ? 'bg-pc-600' : active ? 'bg-pc-600' : 'bg-slate-200'
    }`}
  />
);

// ─── Main component ───────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('welcome');
  const [members, setMembers] = useState<TeamMember[]>([emptyMember()]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [addedMembers, setAddedMembers] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [completing, setCompleting] = useState(false);

  const current = members[currentIdx];

  const updateCurrent = (patch: Partial<TeamMember>) =>
    setMembers((prev) =>
      prev.map((m, i) => (i === currentIdx ? { ...m, ...patch } : m))
    );

  const validate = (): string => {
    if (!current.firstName.trim()) return 'First name is required.';
    if (!current.lastName.trim()) return 'Last name is required.';
    if (!current.email.trim() || !current.email.includes('@'))
      return 'A valid email address is required.';
    return '';
  };

  const saveCurrentMember = useCallback(async (): Promise<boolean> => {
    const err = validate();
    if (err) { setError(err); return false; }
    setError('');
    setSaving(true);
    try {
      await api.post('/settings/team/invite', {
        firstName: current.firstName.trim(),
        lastName: current.lastName.trim(),
        email: current.email.trim().toLowerCase(),
        phone: current.phone.trim() || undefined,
        role: current.role,
        password: current.tempPassword,
        mustChangePassword: true,
      });
      setAddedMembers((prev) => [
        ...prev,
        `${current.firstName} ${current.lastName} (${ROLES.find((r) => r.value === current.role)?.label ?? current.role})`,
      ]);
      return true;
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'Failed to add team member. Check the email is not already registered.';
      setError(msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, [current]);

  const handleAddAnother = async () => {
    const ok = await saveCurrentMember();
    if (!ok) return;
    const next = emptyMember();
    setMembers((prev) => [...prev, next]);
    setCurrentIdx((i) => i + 1);
    setShowPassword(false);
  };

  const handleDoneTeam = async () => {
    const ok = await saveCurrentMember();
    if (!ok) return;
    queryClient.invalidateQueries({ queryKey: ['team'] });
    setStep('done');
  };

  const handleSkipTeam = () => {
    setStep('done');
  };

  const handleFinish = async () => {
    setCompleting(true);
    try {
      await api.post('/settings/onboarding/complete');
    } catch { /* non-fatal */ }
    setCompleting(false);
    onComplete();
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">

        {/* Header bar */}
        <div className="bg-pc-800 px-6 py-4 flex items-center gap-3">
          <Building2 size={20} className="text-[#7ECFB4]" />
          <span className="text-white font-semibold text-sm tracking-wide">
            APOTEKH — Pharmacy Setup
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {(['welcome', 'team', 'done'] as Step[]).map((s, i) => (
              <StepDot key={s} active={step === s} done={
                (step === 'team' && i === 0) ||
                (step === 'done' && i <= 1)
              } />
            ))}
          </div>
        </div>

        {/* ── Welcome step ───────────────────────────────────────────────── */}
        {step === 'welcome' && (
          <div className="p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-pc-800">
                Welcome, {user?.firstName ?? 'Owner'}.
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Your <span className="font-semibold text-pc-700">owner account</span> is ready.
                Before you start, there is one important thing to know:
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <span className="text-2xl mt-0.5">⚠️</span>
              <div className="text-sm text-amber-900 leading-relaxed">
                <p className="font-semibold mb-1">Don't use this account for dispensing.</p>
                <p>
                  This is your <em>management account</em>. Your dispensers,
                  pharmacist in charge, and cashiers each need their own login — so
                  their actions are tracked separately and you can audit them.
                </p>
              </div>
            </div>

            <div className="text-sm text-slate-500 leading-relaxed">
              Let's take 2 minutes to add your team now. You can always add more
              people later from <strong>Settings → Team</strong>.
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setStep('team')}
                className="flex-1 bg-pc-600 hover:bg-pc-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Users size={16} />
                Add my team
                <ChevronRight size={15} />
              </button>
              <button
                onClick={handleFinish}
                className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── Team step ──────────────────────────────────────────────────── */}
        {step === 'team' && (
          <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
            {addedMembers.length > 0 && (
              <div className="bg-pc-50 border border-pc-100 rounded-lg px-4 py-3">
                <p className="text-xs text-pc-700 font-medium mb-1">Added so far:</p>
                {addedMembers.map((m) => (
                  <p key={m} className="text-xs text-pc-800 flex items-center gap-1.5">
                    <CheckCircle size={12} className="text-pc-600 shrink-0" />
                    {m}
                  </p>
                ))}
              </div>
            )}

            <div>
              <h3 className="text-base font-semibold text-pc-800">
                {addedMembers.length === 0 ? 'Add your first team member' : 'Add another team member'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                They will receive a temporary password and be prompted to change it on first login.
              </p>
            </div>

            {/* Role picker */}
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => updateCurrent({ role: r.value })}
                  className={`text-left rounded-lg border px-3 py-2.5 transition-all ${
                    current.role === r.value
                      ? 'border-pc-600 bg-pc-50 ring-1 ring-pc-600'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {r.icon}
                    <span className="text-xs font-medium text-slate-800">{r.label}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 leading-tight line-clamp-2">
                    {r.description}
                  </span>
                </button>
              ))}
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">First name *</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pc-500"
                  value={current.firstName}
                  onChange={(e) => updateCurrent({ firstName: e.target.value })}
                  placeholder="Amina"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Last name *</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pc-500"
                  value={current.lastName}
                  onChange={(e) => updateCurrent({ lastName: e.target.value })}
                  placeholder="Mwangi"
                />
              </div>
            </div>

            {/* Email + phone */}
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Email address *</label>
              <input
                type="email"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pc-500"
                value={current.email}
                onChange={(e) => updateCurrent({ email: e.target.value })}
                placeholder="amina@pharmacy.co.tz"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Phone number <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="tel"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pc-500"
                value={current.phone}
                onChange={(e) => updateCurrent({ phone: e.target.value })}
                placeholder="+255..."
              />
            </div>

            {/* Temp password */}
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Temporary password
                <span className="text-slate-400 font-normal ml-1">(share this with them — they must change it on first login)</span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 flex items-center justify-between">
                  <span className={showPassword ? 'font-mono' : 'tracking-widest text-slate-400'}>
                    {showPassword ? current.tempPassword : '••••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="text-slate-400 hover:text-slate-600 ml-2"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => updateCurrent({ tempPassword: generatePassword() })}
                  className="text-xs text-slate-500 hover:text-slate-700 px-2 border border-slate-200 rounded-lg"
                >
                  New
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex gap-2">
                <button
                  onClick={handleAddAnother}
                  disabled={saving}
                  className="flex-1 border border-pc-600 text-pc-600 hover:bg-pc-50 rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Plus size={15} />
                  {saving ? 'Saving...' : 'Save & add another'}
                </button>
                <button
                  onClick={handleDoneTeam}
                  disabled={saving}
                  className="flex-1 bg-pc-600 hover:bg-pc-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save & continue'}
                  <ChevronRight size={15} />
                </button>
              </div>
              <button
                onClick={handleSkipTeam}
                className="text-sm text-slate-400 hover:text-slate-600 py-1 transition-colors"
              >
                Skip — I'll add my team later
              </button>
            </div>
          </div>
        )}

        {/* ── Done step ──────────────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="p-8 flex flex-col gap-6 items-center text-center">
            <div className="w-16 h-16 rounded-full bg-pc-50 border-2 border-pc-200 flex items-center justify-center">
              <CheckCircle size={32} className="text-pc-600" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-pc-800 mb-2">
                {addedMembers.length > 0 ? "You're all set!" : 'Setup complete.'}
              </h2>
              {addedMembers.length > 0 ? (
                <p className="text-sm text-slate-600 leading-relaxed">
                  {addedMembers.length === 1
                    ? `${addedMembers[0]} has been added.`
                    : `${addedMembers.length} team members have been added.`}{' '}
                  They can log in with the temporary passwords you noted — they'll be
                  prompted to set their own on first login.
                </p>
              ) : (
                <p className="text-sm text-slate-600 leading-relaxed">
                  You can add your team anytime from{' '}
                  <strong>Settings &rarr; Team</strong>. Remember: each staff member
                  should have their own account.
                </p>
              )}
            </div>

            {addedMembers.length > 0 && (
              <div className="w-full bg-slate-50 rounded-lg border border-slate-100 px-4 py-3 text-left">
                {addedMembers.map((m) => (
                  <div key={m} className="flex items-center gap-2 text-sm text-slate-700 py-0.5">
                    <CheckCircle size={13} className="text-pc-600 shrink-0" />
                    {m}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleFinish}
              disabled={completing}
              className="w-full bg-pc-600 hover:bg-pc-700 text-white rounded-lg px-4 py-3 font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {completing ? 'Loading...' : 'Go to Dashboard'}
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

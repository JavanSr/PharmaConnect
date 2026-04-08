import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Shield, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNotificationStore } from '@/stores/notificationStore';
import { api } from '@/lib/api';

const CONDITIONS = ['Hypertension', 'Diabetes Type 2', 'Diabetes Type 1', 'Asthma', 'COPD', 'Epilepsy', 'HIV/AIDS', 'Kidney Disease', 'Heart Disease', 'Liver Disease', 'Pregnancy', 'Breastfeeding', 'Elderly (>65)'];
const ALLERGIES = ['Penicillin', 'Sulfonamides', 'NSAIDs (Ibuprofen/Aspirin)', 'Aspirin', 'Codeine', 'Latex', 'Cephalosporins', 'Fluoroquinolones'];
const OPT_IN_METHODS = ['VERBAL', 'WRITTEN', 'DIGITAL'];

export const NewPatientPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [consented, setConsented] = useState(false);
  const [optInMethod, setOptInMethod] = useState('VERBAL');
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [medInput, setMedInput] = useState('');
  const toast = useNotificationStore(s => s.toast);
  const navigate = useNavigate();

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const mutation = useMutation({
    mutationFn: () => api.post('/patients', {
      chronicConditions: conditions,
      allergyFlags: Object.fromEntries(allergies.map(a => [a, true])),
      activeMedications: medications,
      optInMethod,
    }),
    onSuccess: (res) => {
      toast.success('Patient registered successfully');
      navigate(`/dispensing/patient/${res.data.data.id}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to register patient'),
  });

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <h1 className="text-xl font-bold text-[#0D4035]">Register New Patient</h1>

      {/* Step 1: Consent */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-[#D6F0E8] p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D6F0E8] rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-[#1A6B5C]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#0D4035]">Patient Consent &amp; Privacy</h2>
              <p className="text-xs text-[#64748B]">Step 1 of 2 — Informed Consent</p>
            </div>
          </div>

          <div className="p-4 bg-[#EDF7F3] rounded-xl text-sm text-[#64748B] space-y-2">
            <p className="font-medium text-[#0D4035]">PharmaConnect Privacy Notice</p>
            <p>Your privacy is protected by design. This system does <strong>not</strong> store your name, phone number, or national ID alongside your medicine records.</p>
            <p>You will be assigned a unique anonymous identifier (UUID). Your health records — including conditions, allergies, and dispensing history — are stored under this ID only.</p>
            <p>This data is used to:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Check for dangerous drug interactions before dispensing</li>
              <li>Alert pharmacists to your known allergies</li>
              <li>Support NHIF claims processing</li>
            </ul>
            <p>You may withdraw consent at any time by requesting removal from the pharmacist.</p>
          </div>

          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={consented} onChange={e => setConsented(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#1A6B5C]" />
              <span className="text-sm text-[#0D4035]">I understand and consent to my anonymous health data being stored and used as described above.</span>
            </label>
          </div>

          <div>
            <p className="text-sm font-medium text-[#0D4035] mb-2">Consent Method</p>
            <div className="flex gap-2">
              {OPT_IN_METHODS.map(m => (
                <button key={m} type="button" onClick={() => setOptInMethod(m)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${optInMethod === m ? 'bg-[#1A6B5C] text-white border-[#1A6B5C]' : 'bg-white text-[#64748B] border-[#D6F0E8]'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={() => setStep(2)} disabled={!consented} className="w-full">
            Continue to Health Information
          </Button>
        </div>
      )}

      {/* Step 2: Health Info */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-[#D6F0E8] p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-[#0D4035]">Health Information</h2>
            <p className="text-xs text-[#64748B]">Step 2 of 2 — Conditions, Allergies &amp; Medications</p>
          </div>

          {/* Conditions */}
          <div>
            <p className="text-sm font-medium text-[#0D4035] mb-2">Chronic Conditions</p>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map(c => (
                <button key={c} type="button" onClick={() => toggle(conditions, setConditions, c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${conditions.includes(c) ? 'bg-amber-50 text-[#D97706] border-amber-300' : 'bg-white text-[#64748B] border-[#D6F0E8] hover:bg-[#EDF7F3]'}`}>
                  {conditions.includes(c) && <Check size={10} className="inline mr-1" />}
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Allergies */}
          <div>
            <p className="text-sm font-medium text-[#0D4035] mb-2">Known Allergies</p>
            <div className="flex flex-wrap gap-2">
              {ALLERGIES.map(a => (
                <button key={a} type="button" onClick={() => toggle(allergies, setAllergies, a)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${allergies.includes(a) ? 'bg-red-50 text-[#DC2626] border-red-200' : 'bg-white text-[#64748B] border-[#D6F0E8] hover:bg-[#EDF7F3]'}`}>
                  {allergies.includes(a) && <Check size={10} className="inline mr-1" />}
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Active Medications */}
          <div>
            <p className="text-sm font-medium text-[#0D4035] mb-2">Current Medications</p>
            <div className="flex gap-2 mb-2">
              <input type="text" value={medInput} onChange={e => setMedInput(e.target.value)} placeholder="e.g. Metformin 500mg"
                className="flex-1 h-10 px-3 text-sm border border-[#D6F0E8] rounded-xl focus:outline-none focus:border-[#1A6B5C]"
                onKeyDown={e => { if (e.key === 'Enter' && medInput.trim()) { setMedications([...medications, medInput.trim()]); setMedInput(''); } }} />
              <Button size="sm" type="button" onClick={() => { if (medInput.trim()) { setMedications([...medications, medInput.trim()]); setMedInput(''); } }}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {medications.map(m => (
                <span key={m} className="px-3 py-1 bg-[#D6F0E8] text-[#1A6B5C] rounded-full text-xs flex items-center gap-1">
                  {m}
                  <button type="button" onClick={() => setMedications(medications.filter(x => x !== m))} className="text-[#64748B] hover:text-[#DC2626] ml-1">×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1" onClick={() => mutation.mutate()} loading={mutation.isPending}>
              Register Patient &amp; Start Dispensing
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

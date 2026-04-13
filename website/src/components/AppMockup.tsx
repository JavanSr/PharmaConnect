"use client";

import { motion } from "framer-motion";

const lines = [
  { medicine: "Warfarin 5mg", note: "FEFO" },
  { medicine: "Aspirin 75mg", note: "FEFO" },
  { medicine: "Omeprazole 20mg", note: "FEFO" },
];

export default function AppMockup() {
  return (
    <motion.div
      animate={{ opacity: 1, x: 0, rotate: 2 }}
      className="rounded-2xl border border-slate/15 bg-white p-6 shadow-2xl"
      initial={{ opacity: 0, x: 40, rotate: 2 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{ transform: "rotate(2deg)" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs text-primary">PC-2026-04721</p>
          <p className="mt-2 text-xl font-semibold text-slate">Dispensing session</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
          Member verified
        </span>
      </div>

      <motion.div
        animate={{ borderColor: ["#D97706", "#FCD34D", "#D97706"] }}
        className="mt-6 rounded-xl border bg-amber-50 p-4"
        initial={{ x: 40, opacity: 0 }}
        transition={{ duration: 1.5, times: [0, 0.5, 1] }}
      >
        <p className="text-sm font-semibold text-amber-700">⚠ MODERATE interaction — Warfarin + Aspirin</p>
      </motion.div>

      <div className="mt-6 grid gap-3">
        {lines.map((line, index) => (
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between rounded-xl border border-slate/10 bg-primary-lightest p-4"
            initial={{ opacity: 0, x: 40 }}
            key={line.medicine}
            transition={{ delay: index * 0.1, duration: 0.45, ease: "easeOut" }}
          >
            <div>
              <p className="font-medium text-slate">{line.medicine}</p>
              <p className="text-sm text-slate/55">Selected for dispensing</p>
            </div>
            <span className="rounded-full bg-amber/15 px-3 py-1 text-xs font-medium text-amber">
              {line.note}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

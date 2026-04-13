"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInView, useSpring } from "framer-motion";

interface StatCardProps {
  value: string | number;
  label: string;
  suffix?: string;
}

export default function StatCard({ value, label, suffix = "" }: StatCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const spring = useSpring(0, { stiffness: 90, damping: 20 });
  const [display, setDisplay] = useState<string | number>(typeof value === "number" ? 0 : value);
  const numericValue = typeof value === "number" ? value : null;
  const isCurrency = typeof value === "string" && value.startsWith("USD");

  useEffect(() => {
    if (!isInView || numericValue === null) {
      return;
    }
    spring.set(numericValue);
  }, [isInView, numericValue, spring]);

  useEffect(() => {
    if (numericValue === null) {
      return;
    }
    const unsubscribe = spring.on("change", (latest) => {
      setDisplay(Math.round(latest));
    });
    return unsubscribe;
  }, [numericValue, spring]);

  const formattedValue = useMemo(() => {
    if (numericValue !== null) {
      return display;
    }
    if (isCurrency) {
      return value;
    }
    return value;
  }, [display, isCurrency, numericValue, value]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-5" ref={ref}>
      <div className="font-serif text-4xl leading-none text-white md:text-5xl">
        {formattedValue}
        {suffix}
      </div>
      <div className="my-4 h-px bg-white/15" />
      <p className="text-sm leading-relaxed text-white/70">{label}</p>
    </div>
  );
}

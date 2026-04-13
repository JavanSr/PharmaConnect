 "use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "left" | "none";
}

export default function AnimatedSection({
  children,
  delay = 0,
  className,
  direction = "up",
}: AnimatedSectionProps) {
  const ref = useRef<HTMLElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const initial = {
    opacity: 0,
    y: direction === "up" ? 24 : 0,
    x: direction === "left" ? -32 : 0,
  };

  return (
    <motion.section
      ref={ref}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : initial}
      className={cn(className)}
      initial={initial}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
    >
      {children}
    </motion.section>
  );
}

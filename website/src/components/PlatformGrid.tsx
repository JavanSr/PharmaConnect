"use client";

import { useMemo, useState } from "react";
import ModuleCard from "@/components/ModuleCard";
import type { Module } from "@/lib/data/modules";
import { cn } from "@/lib/utils";

interface PlatformGridProps {
  modules: Module[];
  hideFilter?: boolean;
}

type Filter = "all" | "available" | "coming";

const filters: Array<{ label: string; value: Filter }> = [
  { label: "All", value: "all" },
  { label: "Available now", value: "available" },
  { label: "Coming soon", value: "coming" },
];

export default function PlatformGrid({ modules, hideFilter = false }: PlatformGridProps) {
  const [activeFilter, setActiveFilter] = useState<Filter>("all");

  const visibleModules = useMemo(() => {
    if (hideFilter) return modules;
    if (activeFilter === "available") {
      return modules.filter((module) => module.available);
    }
    if (activeFilter === "coming") {
      return modules.filter((module) => !module.available);
    }
    return modules;
  }, [activeFilter, hideFilter, modules]);

  return (
    <div>
      {!hideFilter && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const active = filter.value === activeFilter;
            return (
              <button
                className={cn(
                  "min-h-11 rounded-full border px-4 text-sm font-medium transition duration-150",
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-slate/10 bg-primary-lightest text-slate/50 hover:text-primary",
                )}
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                type="button"
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      )}
      <div className={cn("grid gap-5 md:grid-cols-2 xl:grid-cols-3", !hideFilter && "mt-8")}>
        {visibleModules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>
    </div>
  );
}

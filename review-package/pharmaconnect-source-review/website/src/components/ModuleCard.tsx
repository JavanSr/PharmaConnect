import Link from "next/link";
import * as Icons from "lucide-react";
import Badge from "@/components/ui/Badge";
import type { Module } from "@/lib/data/modules";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  module: Module;
  mini?: boolean;
}

export default function ModuleCard({ module, mini = false }: ModuleCardProps) {
  const Icon = (Icons[module.icon as keyof typeof Icons] ?? Icons.Box) as Icons.LucideIcon;

  if (mini) {
    return (
      <Link
        className="rounded-lg bg-mist p-4 transition duration-150 hover:bg-primary-lightest"
        href={`/platform/${module.slug}`}
      >
        <p className="font-mono text-xs text-slate/40">{module.id}</p>
        <div className="mt-2 flex items-center gap-2">
          <p className="font-medium text-slate">{module.name}</p>
          <Badge variant={module.available ? "primary" : "coming-soon"}>
            {module.available ? "Available now" : "Coming soon"}
          </Badge>
        </div>
        <p className="mt-2 line-clamp-1 text-sm text-slate/65">{module.description}</p>
      </Link>
    );
  }

  const card = (
    <article className="relative rounded-xl border border-slate/10 bg-white p-6 transition duration-150 hover:border-primary/30 hover:shadow-md">
      <div className="absolute right-6 top-6">
        <Badge variant={module.available ? "primary" : "coming-soon"}>
          {module.available ? "Available now" : "Coming soon"}
        </Badge>
      </div>
      <p className="font-mono text-xs text-slate/40">{module.id}</p>
      <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-lightest text-primary">
        <Icon size={24} />
      </div>
      <h3 className="mt-5 text-base font-medium text-slate">{module.name}</h3>
      <p className="mt-3 line-clamp-2 text-sm text-slate/65">{module.description}</p>
      {!module.available ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary-dark/85 backdrop-blur-sm">
          <span className="text-sm font-medium text-white">Coming soon</span>
        </div>
      ) : null}
    </article>
  );

  if (module.available) {
    return (
      <Link className="block" href={`/platform/${module.slug}`}>
        {card}
      </Link>
    );
  }

  return <div className={cn("block")}>{card}</div>;
}

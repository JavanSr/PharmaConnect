import Link from "next/link";
import Badge from "@/components/ui/Badge";
import type { Module } from "@/lib/data/modules";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  module: Module;
  mini?: boolean;
}

export default function ModuleCard({ module, mini = false }: ModuleCardProps) {
  const content = (
    <article
      className={cn(
        "relative h-full overflow-hidden rounded-lg border border-slate/10 bg-white p-6 shadow-sm transition hover:shadow-md",
        mini && "p-4",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-slate/45">{module.id}</p>
          <div className="mt-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">
            {module.icon.slice(0, 2).toUpperCase()}
          </div>
        </div>
        <Badge variant={module.phase === 1 ? "primary" : "coming-soon"}>
          {module.phase === 1 ? "Available now" : "Future availability"}
        </Badge>
      </div>
      <h3 className="mt-5 text-base font-semibold text-slate">{module.name}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate/65">
        {module.description}
      </p>
      {module.phase > 1 ? (
        <div className="absolute inset-0 flex items-center justify-center bg-primary-dark/85 p-6 text-center text-sm font-semibold text-white backdrop-blur-sm">
          Available in the future
        </div>
      ) : null}
    </article>
  );

  if (module.phase === 1) {
    return <Link href={`/platform/${module.slug}`}>{content}</Link>;
  }

  return content;
}

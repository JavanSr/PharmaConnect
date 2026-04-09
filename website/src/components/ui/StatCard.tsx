interface StatCardProps {
  value: string | number;
  label: string;
  suffix?: string;
}

export default function StatCard({ value, label, suffix = "" }: StatCardProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="font-serif text-4xl leading-none text-white md:text-5xl">
        {value}
        {suffix}
      </div>
      <div className="my-4 h-px bg-white/15" />
      <p className="text-sm leading-relaxed text-white/70">{label}</p>
    </div>
  );
}

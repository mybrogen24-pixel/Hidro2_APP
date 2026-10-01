import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  tone?: "cyan" | "blue" | "amber" | "slate";
}

export function MetricCard({ label, value, helper, icon: Icon, tone = "cyan" }: MetricCardProps) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.8} /></div>
      <p>{label}</p>
      <strong>{value}</strong>
      {helper ? <span>{helper}</span> : null}
    </article>
  );
}

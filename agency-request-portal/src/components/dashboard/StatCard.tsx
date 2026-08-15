import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "brand" | "danger" | "warning" | "success";

const TONES: Record<Tone, { value: string; ring: string }> = {
  neutral: { value: "text-slate-900", ring: "border-slate-200" },
  brand: { value: "text-brand-700", ring: "border-brand-200" },
  danger: { value: "text-red-700", ring: "border-red-200" },
  warning: { value: "text-amber-700", ring: "border-amber-200" },
  success: { value: "text-emerald-700", ring: "border-emerald-200" },
};

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: Tone;
  href?: string;
}) {
  const styles = TONES[tone];
  const content = (
    <>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className={cn("mt-2 text-3xl font-semibold tabular-nums", styles.value)}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </>
  );

  const className = cn(
    "block rounded-xl border bg-white px-5 py-4 shadow-card transition",
    styles.ring,
    href && "hover:border-slate-300 hover:shadow-md",
  );

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-slate-900">{value}</span>
    </div>
  );
}

import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-subtle text-ink-muted border-border",
  brand: "bg-brand-50 text-brand-700 border-brand-100",
  success: "bg-green-50 text-success border-green-100",
  warning: "bg-amber-50 text-warning border-amber-100",
  danger: "bg-red-50 text-danger border-red-100",
  info: "bg-blue-50 text-info border-blue-100",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

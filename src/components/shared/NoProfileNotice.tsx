import { AlertTriangle } from "lucide-react";

export function NoProfileNotice() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-surface-subtle px-6 text-center">
      <AlertTriangle className="h-8 w-8 text-warning" />
      <h1 className="text-lg font-semibold text-ink">Account not linked yet</h1>
      <p className="max-w-sm text-sm text-ink-muted">
        You&apos;re signed in, but this login isn&apos;t linked to a business yet. Run the
        &quot;LINK YOUR LOGIN&quot; snippet at the bottom of{" "}
        <code className="rounded bg-surface px-1 py-0.5 text-xs">supabase/seed.sql</code> in the
        Supabase SQL editor, then refresh.
      </p>
    </div>
  );
}

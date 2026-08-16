import { AlertTriangle } from "lucide-react";

export function NoProfileNotice() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-surface-subtle px-6 text-center">
      <AlertTriangle className="h-8 w-8 text-warning" />
      <h1 className="text-lg font-semibold text-ink">Account not linked yet</h1>
      <p className="max-w-sm text-sm text-ink-muted">
        You&apos;re signed in, but this login isn&apos;t attached to the salon. Signing out and back
        in usually fixes it — the database links new logins automatically (see
        <code className="mx-1 rounded bg-surface px-1 py-0.5 text-xs">
          supabase/migrations/0010_auth_bootstrap.sql
        </code>
        ). If it keeps happening, make sure that migration has been applied.
      </p>
    </div>
  );
}

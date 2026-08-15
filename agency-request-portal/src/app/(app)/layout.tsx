import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { AlertsMenu, type AlertItem } from "@/components/layout/AlertsMenu";
import { Sidebar } from "@/components/layout/Sidebar";
import { signOutAction } from "@/lib/actions";
import { getSessionUser } from "@/lib/auth";
import { getRepo, isDemoMode } from "@/lib/data";
import { describeDeadline, formatDate, todayISO } from "@/lib/logic";
import { alertRequests } from "@/lib/stats";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user && isSupabaseConfigured) redirect("/login");

  const today = todayISO();
  const requests = await getRepo().listRequests();
  const alerts = alertRequests(requests, today);

  const items: AlertItem[] = [...alerts.overdue, ...alerts.dueSoon].map((request) => ({
    id: request.id,
    reference: request.reference,
    title: request.title,
    designer: request.designer?.name ?? "Unassigned",
    deadlineLabel: formatDate(request.deadline),
    detail: describeDeadline(request, today) ?? "",
    kind: alerts.overdue.includes(request) ? "overdue" : "due-soon",
  }));

  return (
    <div className="min-h-screen">
      {isDemoMode ? (
        <p className="bg-slate-900 px-4 py-1.5 text-center text-xs text-slate-300">
          Demo mode — sample data held in memory. Add Supabase credentials to make it permanent and
          shared.
        </p>
      ) : null}

      <div className="mx-auto flex w-full max-w-[100rem] flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-white lg:min-h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              KFH
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">Agency Portal</p>
              <p className="text-xs text-slate-500">Marketing</p>
            </div>
          </div>
          <div className="px-3 pb-4">
            <Sidebar />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-end gap-3 border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur">
            <AlertsMenu items={items} />

            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">{user?.label ?? "Account Manager"}</p>
              <p className="text-xs text-slate-500">{user?.email ?? "demo mode"}</p>
            </div>

            {isSupabaseConfigured ? (
              <form action={signOutAction}>
                <button
                  type="submit"
                  title="Sign out"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  <span className="sr-only sm:not-sr-only">Sign out</span>
                </button>
              </form>
            ) : null}
          </header>

          <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">{children}</main>

          <footer className="px-5 py-6 text-xs text-slate-400 lg:px-8">
            KFH Marketing · Agency Request Portal ·{" "}
            <Link href="/settings" className="hover:text-slate-600">
              Manage designers and work types
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardBody } from "@/components/ui/Card";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            KFH Marketing
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Agency Request Portal</h1>
          <p className="mt-1 text-sm text-slate-500">
            Design requests, deadlines and deliverables in one place.
          </p>
        </div>

        <Card>
          <CardBody className="p-6">
            {isSupabaseConfigured ? (
              <LoginForm />
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-sm text-slate-600">
                  Running in <span className="font-medium text-slate-900">demo mode</span> with
                  sample data. No sign-in is required until Supabase is connected.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
                >
                  Open the portal
                </Link>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

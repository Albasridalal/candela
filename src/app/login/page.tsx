"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsLoading(true);
    const supabase = createClient();

    if (mode === "sign-in") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setIsLoading(false);
      if (signInError) return setError(signInError.message);
      router.push("/dashboard");
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setIsLoading(false);
    if (signUpError) return setError(signUpError.message);

    // The database links every new login to the salon automatically, so a
    // confirmed signup can go straight to the dashboard.
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    setNotice("Check your email to confirm the account, then sign in.");
    setMode("sign-in");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-subtle px-6">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-semibold text-ink">Salon admin</h1>
        <p className="mt-1 text-sm text-ink-muted">Appointments, customers and your team.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {mode === "sign-up" && (
          <div>
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
        )}
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Password</Label>
          <Input
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {notice && <p className="text-sm text-ink-muted">{notice}</p>}

        <Button type="submit" className="w-full" isLoading={isLoading}>
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </Button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setError(null);
          }}
          className="w-full text-center text-sm text-ink-muted hover:text-ink"
        >
          {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>

      <Link href="/book" className="mt-8 text-sm font-medium text-brand-700 hover:underline">
        Are you a customer? Book an appointment →
      </Link>
    </div>
  );
}

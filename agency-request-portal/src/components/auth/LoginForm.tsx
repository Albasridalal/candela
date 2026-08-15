"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/Button";
import { Field, FormError, Input } from "@/components/ui/Field";
import { IDLE } from "@/lib/action-state";
import { signInAction } from "@/lib/actions";

export function LoginForm() {
  const [state, formAction] = useActionState(signInAction, IDLE);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />

      <Field label="Work email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@kfh.com"
          required
        />
      </Field>

      <Field label="Password" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}

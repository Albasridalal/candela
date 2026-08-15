"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/ui/Button";
import { FormError, Input } from "@/components/ui/Field";
import { IDLE } from "@/lib/action-state";
import { addDesignerAction, addWorkTypeAction } from "@/lib/actions";

/** Resets the inputs once the server action reports success. */
function useResetOnSuccess(error: string | null, count: number) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!error) formRef.current?.reset();
  }, [count, error]);
  return formRef;
}

export function AddDesignerForm({ count }: { count: number }) {
  const [state, formAction] = useActionState(addDesignerAction, IDLE);
  const formRef = useResetOnSuccess(state.error, count);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <FormError message={state.error} />
      <div className="flex flex-wrap gap-2">
        <Input name="name" placeholder="Designer name" aria-label="Designer name" required className="flex-1" />
        <Input
          name="email"
          type="email"
          placeholder="Email (optional)"
          aria-label="Designer email"
          className="flex-1"
        />
        <SubmitButton size="sm" pendingLabel="Adding…">
          Add
        </SubmitButton>
      </div>
    </form>
  );
}

export function AddWorkTypeForm({ count }: { count: number }) {
  const [state, formAction] = useActionState(addWorkTypeAction, IDLE);
  const formRef = useResetOnSuccess(state.error, count);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <FormError message={state.error} />
      <div className="flex flex-wrap gap-2">
        <Input
          name="name"
          placeholder="e.g. Video, Print, Copywriting"
          aria-label="Work type name"
          required
          className="flex-1"
        />
        <SubmitButton size="sm" pendingLabel="Adding…">
          Add
        </SubmitButton>
      </div>
    </form>
  );
}

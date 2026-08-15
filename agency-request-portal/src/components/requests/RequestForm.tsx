"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/Button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/Field";
import { IDLE } from "@/lib/action-state";
import { createRequestAction, updateRequestAction } from "@/lib/actions";
import type { Designer, RequestDetail, WorkType } from "@/lib/types";
import { PRIORITIES, STATUSES } from "@/lib/types";

export type RequestFormDefaults = Partial<
  Pick<
    RequestDetail,
    "title" | "brief" | "priority" | "date_submitted" | "deadline" | "status"
  >
> & {
  id?: string;
  work_type_id?: string | null;
  designer_id?: string | null;
};

export function RequestForm({
  mode,
  defaults,
  designers,
  workTypes,
  today,
}: {
  mode: "create" | "edit";
  defaults: RequestFormDefaults;
  designers: Designer[];
  workTypes: WorkType[];
  today: string;
}) {
  const [state, formAction] = useActionState(
    mode === "create" ? createRequestAction : updateRequestAction,
    IDLE,
  );

  return (
    <form action={formAction} className="space-y-5">
      {mode === "edit" ? <input type="hidden" name="id" value={defaults.id} /> : null}

      <FormError message={state.error} />

      <Field label="Title" htmlFor="title" required hint="Short summary of the work needed.">
        <Input
          id="title"
          name="title"
          defaultValue={defaults.title ?? ""}
          placeholder="e.g. Eid campaign key visual"
          maxLength={200}
          required
          autoFocus={mode === "create"}
        />
      </Field>

      <Field
        label="Brief"
        htmlFor="brief"
        hint="Everything the designer needs: sizes, languages, tone, what to avoid."
      >
        <Textarea id="brief" name="brief" rows={6} defaultValue={defaults.brief ?? ""} />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Work type" htmlFor="work_type_id">
          <Select
            id="work_type_id"
            name="work_type_id"
            defaultValue={defaults.work_type_id ?? ""}
          >
            <option value="">Not set</option>
            {workTypes.map((workType) => (
              <option key={workType.id} value={workType.id}>
                {workType.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Priority" htmlFor="priority" required>
          <Select id="priority" name="priority" defaultValue={defaults.priority ?? "Medium"}>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Date submitted"
          htmlFor="date_submitted"
          required
          hint="Defaults to today. Change it if the request was sent earlier."
        >
          <Input
            id="date_submitted"
            name="date_submitted"
            type="date"
            defaultValue={defaults.date_submitted ?? today}
            required
          />
        </Field>

        <Field label="Deadline / needed by" htmlFor="deadline">
          <Input
            id="deadline"
            name="deadline"
            type="date"
            defaultValue={defaults.deadline ?? ""}
          />
        </Field>

        <Field label="Assigned designer" htmlFor="designer_id">
          <Select id="designer_id" name="designer_id" defaultValue={defaults.designer_id ?? ""}>
            <option value="">Unassigned</option>
            {designers.map((designer) => (
              <option key={designer.id} value={designer.id}>
                {designer.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Status" htmlFor="status" required>
          <Select id="status" name="status" defaultValue={defaults.status ?? "New"}>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex items-center gap-3 border-t border-slate-200 pt-5">
        <SubmitButton pendingLabel="Saving…">
          {mode === "create" ? "Create request" : "Save changes"}
        </SubmitButton>
        <Link
          href={mode === "edit" && defaults.id ? `/requests/${defaults.id}` : "/requests"}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

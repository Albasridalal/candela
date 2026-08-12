"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { branchSchema, BranchFormValues } from "@/lib/validations/schemas";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { FormField, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Branch, OpeningHours } from "@/lib/types/database.types";

const DAYS: { key: string; label: string }[] = [
  { key: "sun", label: "Sunday" },
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
];

const DEFAULT_HOURS: OpeningHours = Object.fromEntries(
  DAYS.map((d) => [d.key, { open: "10:00", close: "21:00" }])
);

interface DayRow {
  key: string;
  isOpen: boolean;
  open: string;
  close: string;
}

function hoursToRows(hours: OpeningHours | null): DayRow[] {
  return DAYS.map((d) => {
    const existing = hours?.[d.key];
    return {
      key: d.key,
      isOpen: !!existing,
      open: existing?.open ?? "10:00",
      close: existing?.close ?? "21:00",
    };
  });
}

function rowsToHours(rows: DayRow[]): OpeningHours {
  const result: OpeningHours = {};
  rows.forEach((r) => {
    if (r.isOpen) result[r.key] = { open: r.open, close: r.close };
  });
  return result;
}

export function BranchFormModal({
  open,
  onClose,
  branch,
  businessId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  branch?: Branch;
  businessId: string;
  onSaved: (b: Branch) => void;
}) {
  const { show } = useToast();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hourRows, setHourRows] = useState<DayRow[]>(
    hoursToRows(branch?.opening_hours ?? DEFAULT_HOURS)
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    values: {
      name: branch?.name ?? "",
      address: branch?.address ?? "",
      phone: branch?.phone ?? "",
      is_active: branch?.is_active ?? true,
    },
  });

  function updateRow(key: string, patch: Partial<DayRow>) {
    setHourRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function onSubmit(values: BranchFormValues) {
    setIsSubmitting(true);
    const payload = {
      name: values.name,
      address: values.address || null,
      phone: values.phone || null,
      is_active: values.is_active,
      opening_hours: rowsToHours(hourRows),
    };

    if (branch) {
      const { data, error } = await supabase
        .from("branches")
        .update(payload)
        .eq("id", branch.id)
        .select()
        .single();
      setIsSubmitting(false);
      if (error || !data) return show("Couldn't update branch.", "error");
      show("Branch updated");
      onSaved(data as Branch);
    } else {
      const { data, error } = await supabase
        .from("branches")
        .insert({ ...payload, business_id: businessId })
        .select()
        .single();
      setIsSubmitting(false);
      if (error || !data) return show("Couldn't create branch.", "error");
      show("Branch added");
      onSaved(data as Branch);
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={branch ? "Edit Branch" : "Add Branch"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Branch name" error={errors.name?.message}>
          <Input {...register("name")} placeholder="e.g. Main Branch" />
        </FormField>
        <FormField label="Address" error={errors.address?.message}>
          <Input {...register("address")} placeholder="Optional" />
        </FormField>
        <FormField label="Phone" error={errors.phone?.message}>
          <Input {...register("phone")} placeholder="Optional" />
        </FormField>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" {...register("is_active")} /> Active
        </label>

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">Opening hours</p>
          <p className="mb-2 text-xs text-ink-muted">
            Used to bound staff availability for online booking — a slot never shows outside these
            hours, even if a staff member is scheduled to work.
          </p>
          <div className="space-y-1.5">
            {hourRows.map((r) => {
              const day = DAYS.find((d) => d.key === r.key)!;
              return (
                <div key={r.key} className="flex items-center gap-2">
                  <label className="flex w-24 shrink-0 items-center gap-2 text-xs text-ink">
                    <input
                      type="checkbox"
                      checked={r.isOpen}
                      onChange={(e) => updateRow(r.key, { isOpen: e.target.checked })}
                    />
                    {day.label.slice(0, 3)}
                  </label>
                  <Input
                    type="time"
                    disabled={!r.isOpen}
                    value={r.open}
                    onChange={(e) => updateRow(r.key, { open: e.target.value })}
                    className="h-9"
                  />
                  <span className="text-xs text-ink-muted">to</span>
                  <Input
                    type="time"
                    disabled={!r.isOpen}
                    value={r.close}
                    onChange={(e) => updateRow(r.key, { close: e.target.value })}
                    className="h-9"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {branch ? "Save changes" : "Add branch"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

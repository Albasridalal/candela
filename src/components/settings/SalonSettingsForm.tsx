"use client";

import { useState } from "react";
import { Clock, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Branch, Business, OpeningHours } from "@/lib/types/database.types";
import { SALON_TIMEZONE } from "@/lib/utils/timezone";
import { cn } from "@/lib/utils/cn";

const DAYS = [
  { key: "sun", label: "Sunday" },
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
];

interface DayRow {
  key: string;
  label: string;
  isOpen: boolean;
  open: string;
  close: string;
}

function toRows(hours: OpeningHours | null): DayRow[] {
  return DAYS.map((day) => {
    const existing = hours?.[day.key];
    return {
      key: day.key,
      label: day.label,
      isOpen: !!existing,
      open: existing?.open ?? "10:00",
      close: existing?.close ?? "21:00",
    };
  });
}

function toOpeningHours(rows: DayRow[]): OpeningHours {
  const hours: OpeningHours = {};
  rows.forEach((row) => {
    if (row.isOpen) hours[row.key] = { open: row.open, close: row.close };
  });
  return hours;
}

export function SalonSettingsForm({
  business,
  branch,
}: {
  business: Business | null;
  branch: Branch | null;
}) {
  const supabase = createClient();
  const { show } = useToast();

  const [name, setName] = useState(business?.name ?? "");
  const [address, setAddress] = useState(branch?.address ?? "");
  const [phone, setPhone] = useState(branch?.phone ?? "");
  const [rows, setRows] = useState<DayRow[]>(toRows(branch?.opening_hours ?? null));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(key: string, patch: Partial<DayRow>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function copyMondayToAll() {
    const monday = rows.find((r) => r.key === "mon");
    if (!monday) return;
    setRows((prev) =>
      prev.map((row) => ({ ...row, isOpen: monday.isOpen, open: monday.open, close: monday.close }))
    );
  }

  async function save() {
    setError(null);

    const invalid = rows.find((row) => row.isOpen && row.close <= row.open);
    if (invalid) {
      setError(`${invalid.label}: closing time must be after opening time.`);
      return;
    }

    setIsSaving(true);

    if (business && name.trim() && name.trim() !== business.name) {
      const { error: businessError } = await supabase
        .from("businesses")
        .update({ name: name.trim() })
        .eq("id", business.id);
      if (businessError) {
        setIsSaving(false);
        setError("Couldn't save the salon name.");
        return;
      }
    }

    if (branch) {
      const { error: branchError } = await supabase
        .from("branches")
        .update({
          address: address.trim() || null,
          phone: phone.trim() || null,
          opening_hours: toOpeningHours(rows),
        })
        .eq("id", branch.id);
      if (branchError) {
        setIsSaving(false);
        setError("Couldn't save the opening hours.");
        return;
      }
    }

    setIsSaving(false);
    show("Settings saved");
  }

  if (!branch) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-ink-muted">
          No salon location exists yet. Sign out and back in to have one created automatically.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardContent className="space-y-4 py-5">
          <h2 className="text-sm font-semibold text-ink">Salon details</h2>
          <FormField label="Salon name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Candela Beauty" />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Address">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" />
            </FormField>
            <FormField label="Phone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
            </FormField>
          </div>
          <p className="text-xs text-ink-muted">
            All times run on the salon clock ({SALON_TIMEZONE}). Change it with the
            NEXT_PUBLIC_SALON_TIMEZONE environment variable.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 py-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Clock className="h-4 w-4 text-brand-600" /> Opening hours
            </h2>
            <button
              type="button"
              onClick={copyMondayToAll}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              Apply Monday to all days
            </button>
          </div>
          <p className="text-xs text-ink-muted">
            Customers can only book online inside these hours, and the calendar shades everything
            outside them.
          </p>

          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.key}
                className={cn(
                  "flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2",
                  !row.isOpen && "bg-surface-subtle"
                )}
              >
                <label className="flex w-32 shrink-0 items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={row.isOpen}
                    onChange={(e) => updateRow(row.key, { isOpen: e.target.checked })}
                    className="h-4 w-4 accent-[color:var(--color-brand)]"
                  />
                  {row.label}
                </label>

                {row.isOpen ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      type="time"
                      value={row.open}
                      onChange={(e) => updateRow(row.key, { open: e.target.value })}
                      className="h-9 max-w-[8rem]"
                      aria-label={`${row.label} opening time`}
                    />
                    <span className="text-xs text-ink-muted">to</span>
                    <Input
                      type="time"
                      value={row.close}
                      onChange={(e) => updateRow(row.key, { close: e.target.value })}
                      className="h-9 max-w-[8rem]"
                      aria-label={`${row.label} closing time`}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-ink-muted">Closed</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={save} isLoading={isSaving}>
          <Save className="h-4 w-4" /> Save settings
        </Button>
      </div>
    </div>
  );
}

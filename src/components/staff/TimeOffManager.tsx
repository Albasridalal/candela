"use client";

import { useState } from "react";
import { Plus, Trash2, CalendarOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StaffTimeOff } from "@/lib/types/staffTimeOff";
import { formatDateLabel } from "@/lib/utils/date";

export function TimeOffManager({
  staffId,
  initialTimeOff,
}: {
  staffId: string;
  initialTimeOff: StaffTimeOff[];
}) {
  const supabase = createClient();
  const { show } = useToast();
  const [entries, setEntries] = useState(initialTimeOff);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function addTimeOff() {
    if (!startDate || !endDate) return;
    setIsSubmitting(true);
    const { data, error } = await supabase
      .from("staff_time_off")
      .insert({ staff_id: staffId, start_date: startDate, end_date: endDate, reason: reason || null })
      .select()
      .single();
    setIsSubmitting(false);
    if (error || !data) return show("Couldn't add time off.", "error");
    setEntries((prev) => [...prev, data as StaffTimeOff].sort((a, b) => a.start_date.localeCompare(b.start_date)));
    setStartDate("");
    setEndDate("");
    setReason("");
    show("Time off added");
  }

  async function removeTimeOff(id: string) {
    await supabase.from("staff_time_off").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div>
      <h2 className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold text-ink">
        <CalendarOff className="h-4 w-4 text-brand-600" /> Breaks & Time Off
      </h2>
      <p className="mb-3 px-1 text-xs text-ink-muted">
        Blocks this staff member from being booked (online or in the calendar) on these dates.
      </p>

      <div className="mb-3 overflow-hidden rounded-card border border-border bg-surface shadow-card divide-y divide-border">
        {entries.length === 0 ? (
          <p className="px-4 py-4 text-sm text-ink-muted">No time off scheduled.</p>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm text-ink">
                  {formatDateLabel(e.start_date)} – {formatDateLabel(e.end_date)}
                </p>
                {e.reason && <p className="text-xs text-ink-muted">{e.reason}</p>}
              </div>
              <button
                onClick={() => removeTimeOff(e.id)}
                className="rounded-lg p-1.5 text-danger hover:bg-red-50"
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-ink-muted">Start date</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-muted">End date</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
        </div>
        <div className="min-w-[8rem] flex-1">
          <label className="mb-1 block text-xs text-ink-muted">Reason (optional)</label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} className="h-9" placeholder="Vacation" />
        </div>
        <Button size="sm" onClick={addTimeOff} isLoading={isSubmitting} disabled={!startDate || !endDate}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
    </div>
  );
}

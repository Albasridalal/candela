"use client";

import { useState } from "react";
import { Plus, Building2, Pencil, Archive, ArchiveRestore, Trash2, MapPin, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Feedback";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BranchFormModal } from "./BranchFormModal";
import { Branch } from "@/lib/types/database.types";

const DAY_LABELS: Record<string, string> = {
  sun: "Sun",
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
};
const DAY_ORDER = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function summarizeHours(branch: Branch): string {
  if (!branch.opening_hours) return "Hours not set";
  const openDays = DAY_ORDER.filter((d) => branch.opening_hours?.[d]);
  if (openDays.length === 0) return "Closed every day";
  const groups: { days: string[]; open: string; close: string }[] = [];
  openDays.forEach((d) => {
    const hours = branch.opening_hours![d]!;
    const last = groups[groups.length - 1];
    if (last && last.open === hours.open && last.close === hours.close) {
      last.days.push(d);
    } else {
      groups.push({ days: [d], open: hours.open, close: hours.close });
    }
  });
  return groups
    .map((g) => {
      const label =
        g.days.length > 1
          ? `${DAY_LABELS[g.days[0]]}\u2013${DAY_LABELS[g.days[g.days.length - 1]]}`
          : DAY_LABELS[g.days[0]];
      return `${label} ${g.open}\u2013${g.close}`;
    })
    .join(", ");
}

export function BranchesClient({
  initialBranches,
  businessId,
}: {
  initialBranches: Branch[];
  businessId: string;
}) {
  const supabase = createClient();
  const { show } = useToast();
  const [branches, setBranches] = useState(initialBranches);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | undefined>(undefined);
  const [deleting, setDeleting] = useState<Branch | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState(false);

  function openNew() {
    setEditing(undefined);
    setModalOpen(true);
  }
  function openEdit(b: Branch) {
    setEditing(b);
    setModalOpen(true);
  }

  function upsertLocal(branch: Branch) {
    setBranches((prev) => {
      const exists = prev.some((b) => b.id === branch.id);
      return exists ? prev.map((b) => (b.id === branch.id ? branch : b)) : [...prev, branch];
    });
  }

  async function toggleActive(b: Branch) {
    const { data, error } = await supabase
      .from("branches")
      .update({ is_active: !b.is_active })
      .eq("id", b.id)
      .select()
      .single();
    if (error || !data) return show("Couldn't update branch.", "error");
    upsertLocal(data as Branch);
    show(data.is_active ? "Branch restored" : "Branch archived");
  }

  async function confirmDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    const { error } = await supabase.from("branches").delete().eq("id", deleting.id);
    if (error) {
      await supabase.from("branches").update({ is_active: false }).eq("id", deleting.id);
      setBranches((prev) => prev.map((b) => (b.id === deleting.id ? { ...b, is_active: false } : b)));
      show("This branch has staff or appointments, so it was archived instead of deleted.", "info");
    } else {
      setBranches((prev) => prev.filter((b) => b.id !== deleting.id));
      show("Branch deleted");
    }
    setIsDeleting(false);
    setDeleting(undefined);
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" /> Add branch
        </Button>
      </div>

      {branches.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No branches yet"
          description="Add your first branch to start booking appointments."
          action={
            <Button size="sm" onClick={openNew}>
              Add branch
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {branches.map((b) => (
            <div key={b.id} className="rounded-card border border-border bg-surface p-4 shadow-card">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{b.name}</p>
                  {b.address && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-muted">
                      <MapPin className="h-3 w-3 shrink-0" /> {b.address}
                    </p>
                  )}
                  {b.phone && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-muted">
                      <Phone className="h-3 w-3 shrink-0" /> {b.phone}
                    </p>
                  )}
                </div>
                <Badge tone={b.is_active ? "success" : "neutral"}>
                  {b.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <p className="mb-3 text-xs text-ink-muted">{summarizeHours(b)}</p>

              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => openEdit(b)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <button
                  onClick={() => toggleActive(b)}
                  className="rounded-lg p-2 text-ink-muted hover:bg-surface-subtle"
                  aria-label={b.is_active ? "Archive" : "Restore"}
                >
                  {b.is_active ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setDeleting(b)}
                  className="rounded-lg p-2 text-danger hover:bg-red-50"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BranchFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        branch={editing}
        businessId={businessId}
        onSaved={upsertLocal}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(undefined)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Delete branch?"
        description={`"${deleting?.name}" will be permanently deleted, unless it has staff or appointments — in that case it will be archived instead.`}
      />
    </div>
  );
}

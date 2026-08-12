"use client";

import { Store, ChevronDown } from "lucide-react";
import { useBranch } from "@/components/shared/BranchProvider";

export function BranchSelector() {
  const { branches, selectedBranch, setSelectedBranchId } = useBranch();

  if (branches.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Store className="h-4 w-4" />
        No branch yet
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center gap-2 rounded-pill border border-border bg-surface px-3 py-2">
      <Store className="h-4 w-4 text-brand-600" />
      <select
        value={selectedBranch?.id ?? ""}
        onChange={(e) => setSelectedBranchId(e.target.value)}
        className="appearance-none bg-transparent pr-5 text-sm font-medium text-ink focus:outline-none"
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-ink-muted" />
    </div>
  );
}

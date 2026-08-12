"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SearchInput } from "@/components/ui/Feedback";
import { Customer } from "@/lib/types/database.types";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDateLabel } from "@/lib/utils/date";

interface Stats {
  customer_id: string;
  total_visits: number;
  last_appointment_at: string | null;
  total_spend: number;
}

export function CustomerListClient({ initialCustomers }: { initialCustomers: Customer[] }) {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState<Record<string, Stats>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("customer_stats").select("*");
      const map: Record<string, Stats> = {};
      (data as Stats[] | null)?.forEach((s) => (map[s.customer_id] = s));
      setStats(map);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialCustomers;
    return initialCustomers.filter(
      (c) => c.full_name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q)
    );
  }, [query, initialCustomers]);

  return (
    <div>
      <SearchInput
        placeholder="Search by name or phone"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4"
      />

      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
        {filtered.map((c, i) => {
          const s = stats[c.id];
          return (
            <Link
              key={c.id}
              href={`/customers/${c.id}`}
              className={`flex items-center justify-between gap-3 px-4 py-3.5 active:bg-surface-subtle ${
                i !== filtered.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{c.full_name}</p>
                <p className="truncate text-xs text-ink-muted">{c.phone}</p>
                {s?.last_appointment_at && (
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    Last visit {formatDateLabel(s.last_appointment_at)}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-ink-muted">{s?.total_visits ?? 0} visits</p>
                <p className="text-sm font-medium text-ink">{formatCurrency(s?.total_spend ?? 0)}</p>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">No customers match your search.</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SearchInput } from "@/components/ui/Feedback";
import { Customer } from "@/lib/types/database.types";
import { formatDateLabel } from "@/lib/utils/date";

interface Stats {
  customer_id: string;
  total_visits: number;
  last_visit_at: string | null;
}

export function CustomerListClient({ initialCustomers }: { initialCustomers: Customer[] }) {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState<Record<string, Stats>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("customer_stats")
        .select("customer_id, total_visits, last_visit_at");
      const map: Record<string, Stats> = {};
      (data as Stats[] | null)?.forEach((row) => {
        map[row.customer_id] = row;
      });
      setStats(map);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialCustomers;
    const digits = q.replace(/\D/g, "");
    return initialCustomers.filter((customer) => {
      if (customer.full_name.toLowerCase().includes(q)) return true;
      const phone = (customer.phone ?? "").replace(/\D/g, "");
      return digits.length > 0 && phone.includes(digits);
    });
  }, [query, initialCustomers]);

  return (
    <div>
      <SearchInput
        placeholder="Search by name or phone number"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4"
        aria-label="Search customers"
      />

      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
        {filtered.map((customer, i) => {
          const row = stats[customer.id];
          return (
            <Link
              key={customer.id}
              href={`/customers/${customer.id}`}
              className={`flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-surface-subtle ${
                i !== filtered.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{customer.full_name}</p>
                <p className="flex items-center gap-1 truncate text-xs text-ink-muted">
                  <Phone className="h-3 w-3" /> {customer.phone || "No phone"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-ink-muted">{row?.total_visits ?? 0} visits</p>
                {row?.last_visit_at && (
                  <p className="text-[11px] text-ink-muted">
                    Last {formatDateLabel(row.last_visit_at)}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">
            No customers match that search.
          </p>
        )}
      </div>
    </div>
  );
}

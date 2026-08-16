"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Sparkles, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, SearchInput } from "@/components/ui/Feedback";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { FormField, Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceSchema, ServiceFormValues } from "@/lib/validations/schemas";
import { Service, ServiceCategory } from "@/lib/types/database.types";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

type StatusFilter = "all" | "active" | "inactive";

export function ServicesClient({
  initialCategories,
  initialServices,
  businessId,
  autoOpenNew,
}: {
  initialCategories: ServiceCategory[];
  initialServices: Service[];
  businessId: string;
  autoOpenNew?: boolean;
}) {
  const supabase = createClient();
  const { show } = useToast();
  const [categories, setCategories] = useState(initialCategories);
  const [services, setServices] = useState(initialServices);
  const [modalOpen, setModalOpen] = useState(!!autoOpenNew);
  const [editing, setEditing] = useState<Service | undefined>(undefined);
  const [deleting, setDeleting] = useState<Service | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  function openNew() {
    setEditing(undefined);
    setModalOpen(true);
  }
  function openEdit(s: Service) {
    setEditing(s);
    setModalOpen(true);
  }

  function upsertLocal(service: Service) {
    setServices((prev) => {
      const exists = prev.some((s) => s.id === service.id);
      return exists ? prev.map((s) => (s.id === service.id ? service : s)) : [...prev, service];
    });
  }

  async function toggleActive(s: Service) {
    const { data, error } = await supabase
      .from("services")
      .update({ is_active: !s.is_active })
      .eq("id", s.id)
      .select()
      .single();
    if (error || !data) return show("Couldn't update service.", "error");
    upsertLocal(data as Service);
    show(data.is_active ? "Service restored" : "Service archived");
  }

  async function confirmDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    // Services referenced by past appointments/sales can't be hard-deleted
    // safely (FK is `on delete restrict`/`set null` depending on table), so
    // fall back to archiving if the delete is rejected.
    const { error } = await supabase.from("services").delete().eq("id", deleting.id);
    if (error) {
      await supabase.from("services").update({ is_active: false }).eq("id", deleting.id);
      setServices((prev) =>
        prev.map((s) => (s.id === deleting.id ? { ...s, is_active: false } : s))
      );
      show("This service has history, so it was archived instead of deleted.", "info");
    } else {
      setServices((prev) => prev.filter((s) => s.id !== deleting.id));
      show("Service deleted");
    }
    setIsDeleting(false);
    setDeleting(undefined);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q)) return false;
      if (categoryFilter !== "all" && s.category_id !== categoryFilter) return false;
      if (statusFilter === "active" && !s.is_active) return false;
      if (statusFilter === "inactive" && s.is_active) return false;
      return true;
    });
  }, [services, query, categoryFilter, statusFilter]);

  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="flex gap-2">
          <SearchInput
            placeholder="Search services"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Button size="md" onClick={openNew} className="shrink-0">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <FilterChip active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>
            All categories
          </FilterChip>
          {categories.map((c) => (
            <FilterChip key={c.id} active={categoryFilter === c.id} onClick={() => setCategoryFilter(c.id)}>
              {c.name}
            </FilterChip>
          ))}
        </div>
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as StatusFilter[]).map((f) => (
            <FilterChip key={f} active={statusFilter === f} onClick={() => setStatusFilter(f)}>
              {f === "all" ? "All statuses" : f === "active" ? "Active" : "Inactive"}
            </FilterChip>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={services.length === 0 ? "No services yet" : "No services match your filters"}
          description={services.length === 0 ? "Build your service menu." : undefined}
        />
      ) : (
        [...categories, { id: "__none", name: "Uncategorised" } as ServiceCategory].map((cat) => {
          const catServices = filtered.filter((s) =>
            cat.id === "__none" ? !s.category_id : s.category_id === cat.id
          );
          if (catServices.length === 0) return null;
          return (
            <div key={cat.id} className="mb-5">
              <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-ink-muted">
                {cat.name}
              </h2>
              <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card divide-y divide-border">
                {catServices.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 px-4 py-3">
                    <button
                      onClick={() => openEdit(s)}
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{s.name}</p>
                        <p className="text-xs text-ink-muted">{s.duration_minutes} min</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {!s.is_active && <Badge tone="neutral">Inactive</Badge>}
                        <span className="text-sm font-medium text-ink">{formatCurrency(s.price)}</span>
                      </div>
                    </button>
                    <button
                      onClick={() => openEdit(s)}
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-subtle"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleActive(s)}
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-subtle"
                      aria-label={s.is_active ? "Archive" : "Restore"}
                    >
                      {s.is_active ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setDeleting(s)}
                      className="rounded-lg p-1.5 text-danger hover:bg-red-50"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      <ServiceFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        service={editing}
        categories={categories}
        businessId={businessId}
        onSaved={upsertLocal}
        onCategoryCreated={(category) =>
          setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)))
        }
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(undefined)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Delete service?"
        description={`"${deleting?.name}" will be permanently deleted, unless it has appointment or sales history — in that case it will be archived instead.`}
      />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-pill border px-3 py-1.5 text-xs font-medium",
        active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-border bg-surface text-ink-muted"
      )}
    >
      {children}
    </button>
  );
}

const NEW_CATEGORY = "__new";

function ServiceFormModal({
  open,
  onClose,
  service,
  categories,
  businessId,
  onSaved,
  onCategoryCreated,
}: {
  open: boolean;
  onClose: () => void;
  service?: Service;
  categories: ServiceCategory[];
  businessId: string;
  onSaved: (s: Service) => void;
  onCategoryCreated: (category: ServiceCategory) => void;
}) {
  const { show } = useToast();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allStaff, setAllStaff] = useState<{ id: string; full_name: string }[]>([]);
  const [categoryChoice, setCategoryChoice] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    values: {
      name: service?.name ?? "",
      description: service?.description ?? "",
      duration_minutes: service?.duration_minutes ?? 30,
      price: service?.price ?? 0,
      is_active: service?.is_active ?? true,
      staff_ids: [],
    },
  });

  const staffIds = watch("staff_ids");

  useEffect(() => {
    if (!open) return;
    setCategoryChoice(service?.category_id ?? categories[0]?.id ?? NEW_CATEGORY);
    setNewCategoryName("");
    setCategoryError(null);

    (async () => {
      const { data } = await supabase
        .from("staff")
        .select("id, full_name")
        .eq("employment_status", "active")
        .order("full_name");
      setAllStaff(data ?? []);

      if (service) {
        const { data: assigned } = await supabase
          .from("staff_services")
          .select("staff_id")
          .eq("service_id", service.id);
        setValue("staff_ids", (assigned ?? []).map((a) => a.staff_id));
      } else {
        setValue("staff_ids", []);
      }
    })();
  }, [open, service]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleStaff(id: string) {
    const set = new Set(staffIds);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    setValue("staff_ids", Array.from(set));
  }

  /** Resolves the picked category, creating it first when it's a new name. */
  async function resolveCategoryId(): Promise<string | null | undefined> {
    if (categoryChoice !== NEW_CATEGORY) return categoryChoice || null;

    const name = newCategoryName.trim();
    if (name.length < 2) {
      setCategoryError("Enter a category name (e.g. Nails, Hair).");
      return undefined;
    }

    const { data, error } = await supabase
      .from("service_categories")
      .insert({ business_id: businessId, name })
      .select()
      .single();

    if (error || !data) {
      setCategoryError("Couldn't create that category.");
      return undefined;
    }

    onCategoryCreated(data as ServiceCategory);
    return data.id;
  }

  async function onSubmit(values: ServiceFormValues) {
    setCategoryError(null);
    setIsSubmitting(true);

    const categoryId = await resolveCategoryId();
    if (categoryId === undefined) {
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: values.name,
      category_id: categoryId,
      description: values.description || null,
      duration_minutes: values.duration_minutes,
      price: values.price,
      is_active: values.is_active,
    };

    let serviceId = service?.id;
    let savedService: Service | null = null;

    if (service) {
      const { data, error } = await supabase
        .from("services")
        .update(payload)
        .eq("id", service.id)
        .select()
        .single();
      if (error || !data) {
        setIsSubmitting(false);
        return show("Couldn't update service.", "error");
      }
      savedService = data as Service;
    } else {
      const { data, error } = await supabase
        .from("services")
        .insert({ ...payload, business_id: businessId })
        .select()
        .single();
      if (error || !data) {
        setIsSubmitting(false);
        return show("Couldn't create service.", "error");
      }
      savedService = data as Service;
      serviceId = savedService.id;
    }

    if (serviceId) {
      await supabase.from("staff_services").delete().eq("service_id", serviceId);
      if (values.staff_ids.length > 0) {
        await supabase
          .from("staff_services")
          .insert(values.staff_ids.map((staff_id) => ({ staff_id, service_id: serviceId })));
      }
    }

    setIsSubmitting(false);
    show(service ? "Service updated" : "Service added");
    onSaved(savedService);
    if (!service) reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={service ? "Edit Service" : "Add Service"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Service name" error={errors.name?.message}>
          <Input {...register("name")} />
        </FormField>
        <FormField label="Category" error={categoryError ?? undefined}>
          <Select value={categoryChoice} onChange={(e) => setCategoryChoice(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={NEW_CATEGORY}>+ New category…</option>
          </Select>
          {categoryChoice === NEW_CATEGORY && (
            <Input
              className="mt-2"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name, e.g. Nails"
            />
          )}
        </FormField>
        <FormField label="Description" error={errors.description?.message}>
          <Textarea {...register("description")} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Duration (minutes)" error={errors.duration_minutes?.message}>
            <Input type="number" {...register("duration_minutes")} />
          </FormField>
          <FormField label="Price" error={errors.price?.message}>
            <Input type="number" step="0.001" {...register("price")} />
          </FormField>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" {...register("is_active")} /> Active
        </label>

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">Staff who can perform this service</p>
          <div className="flex flex-wrap gap-2">
            {allStaff.length === 0 && <p className="text-xs text-ink-muted">No active staff yet.</p>}
            {allStaff.map((s) => {
              const active = staffIds?.includes(s.id);
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggleStaff(s.id)}
                  className={cn(
                    "rounded-pill border px-3 py-1.5 text-xs font-medium",
                    active
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-border bg-surface text-ink-muted"
                  )}
                >
                  {s.full_name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {service ? "Save changes" : "Add service"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

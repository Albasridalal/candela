"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { staffSchema, StaffFormValues } from "@/lib/validations/schemas";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { FormField, Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Service, Staff } from "@/lib/types/database.types";
import { cn } from "@/lib/utils/cn";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface WorkingHourRow {
  day_of_week: number;
  is_working: boolean;
  start_time: string;
  end_time: string;
}

const defaultHours = (): WorkingHourRow[] =>
  DAYS.map((_, index) => ({
    day_of_week: index,
    is_working: index !== 5, // Friday off by default
    start_time: "10:00",
    end_time: "19:00",
  }));

export function StaffForm({
  staff,
  businessId,
  branchId,
  services,
  initialServiceIds = [],
  initialHours,
}: {
  staff?: Staff;
  businessId: string;
  branchId: string | null;
  services: Service[];
  initialServiceIds?: string[];
  initialHours?: WorkingHourRow[];
}) {
  const router = useRouter();
  const { show } = useToast();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hours, setHours] = useState<WorkingHourRow[]>(initialHours ?? defaultHours());

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      full_name: staff?.full_name ?? "",
      phone: staff?.phone ?? "",
      email: staff?.email ?? "",
      job_title: staff?.job_title ?? "",
      employment_status: staff?.employment_status ?? "active",
      service_ids: initialServiceIds,
    },
  });

  const selectedServiceIds = watch("service_ids");

  function toggleService(id: string) {
    const next = new Set(selectedServiceIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setValue("service_ids", Array.from(next));
  }

  function updateHour(day: number, patch: Partial<WorkingHourRow>) {
    setHours((prev) => prev.map((h) => (h.day_of_week === day ? { ...h, ...patch } : h)));
  }

  function applyFirstWorkingDayToAll() {
    const template = hours.find((h) => h.is_working) ?? hours[0];
    setHours((prev) =>
      prev.map((h) => ({ ...h, start_time: template.start_time, end_time: template.end_time }))
    );
  }

  async function onSubmit(values: StaffFormValues) {
    setError(null);

    const invalid = hours.find((h) => h.is_working && h.end_time <= h.start_time);
    if (invalid) {
      setError(`${DAYS[invalid.day_of_week]}: end time must be after start time.`);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      full_name: values.full_name,
      phone: values.phone || null,
      email: values.email || null,
      job_title: values.job_title || null,
      employment_status: values.employment_status,
    };

    let staffId = staff?.id;

    if (staff) {
      const { error: updateError } = await supabase.from("staff").update(payload).eq("id", staff.id);
      if (updateError) {
        setIsSubmitting(false);
        setError("Couldn't save this staff member.");
        return;
      }
    } else {
      const { data, error: insertError } = await supabase
        .from("staff")
        .insert({ ...payload, business_id: businessId, branch_id: branchId })
        .select("id")
        .single();
      if (insertError || !data) {
        setIsSubmitting(false);
        setError("Couldn't create this staff member.");
        return;
      }
      staffId = data.id;
    }

    if (staffId) {
      await supabase.from("staff_services").delete().eq("staff_id", staffId);
      if (values.service_ids.length > 0) {
        await supabase
          .from("staff_services")
          .insert(values.service_ids.map((service_id) => ({ staff_id: staffId, service_id })));
      }

      await supabase.from("staff_working_hours").delete().eq("staff_id", staffId);
      await supabase.from("staff_working_hours").insert(
        hours.map((h) => ({
          staff_id: staffId,
          day_of_week: h.day_of_week,
          is_working: h.is_working,
          start_time: h.is_working ? h.start_time : null,
          end_time: h.is_working ? h.end_time : null,
        }))
      );
    }

    setIsSubmitting(false);
    show(staff ? "Staff member updated" : "Staff member added");
    router.push(staffId ? `/staff/${staffId}` : "/staff");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-5">
      <div className="space-y-4 rounded-card border border-border bg-surface p-4 shadow-card">
        <FormField label="Full name" error={errors.full_name?.message}>
          <Input {...register("full_name")} placeholder="e.g. Sarah" />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Phone" error={errors.phone?.message}>
            <Input {...register("phone")} placeholder="Optional" />
          </FormField>
          <FormField label="Email" error={errors.email?.message}>
            <Input type="email" {...register("email")} placeholder="Optional" />
          </FormField>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Job title" error={errors.job_title?.message}>
            <Input {...register("job_title")} placeholder="e.g. Hair Stylist" />
          </FormField>
          <FormField label="Status" error={errors.employment_status?.message}>
            <Select {...register("employment_status")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-4 shadow-card">
        <p className="text-sm font-medium text-ink">Services this person provides</p>
        <p className="mb-3 text-xs text-ink-muted">
          Only these services can be booked with them online.
        </p>
        <div className="flex flex-wrap gap-2">
          {services.length === 0 && (
            <p className="text-xs text-ink-muted">Add services first, then assign them here.</p>
          )}
          {services.map((service) => {
            const active = selectedServiceIds?.includes(service.id);
            return (
              <button
                type="button"
                key={service.id}
                onClick={() => toggleService(service.id)}
                className={cn(
                  "rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-border bg-surface text-ink-muted hover:text-ink"
                )}
              >
                {service.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink">Working days & hours</p>
            <p className="text-xs text-ink-muted">Availability online is limited to these hours.</p>
          </div>
          <button
            type="button"
            onClick={applyFirstWorkingDayToAll}
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            Copy hours to all days
          </button>
        </div>

        <div className="space-y-2">
          {hours.map((hour) => (
            <div
              key={hour.day_of_week}
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2",
                !hour.is_working && "bg-surface-subtle"
              )}
            >
              <label className="flex w-32 shrink-0 items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={hour.is_working}
                  onChange={(e) => updateHour(hour.day_of_week, { is_working: e.target.checked })}
                  className="h-4 w-4 accent-[color:var(--color-brand)]"
                />
                {DAYS[hour.day_of_week]}
              </label>
              {hour.is_working ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    type="time"
                    value={hour.start_time}
                    onChange={(e) => updateHour(hour.day_of_week, { start_time: e.target.value })}
                    className="h-9 max-w-[8rem]"
                    aria-label={`${DAYS[hour.day_of_week]} start time`}
                  />
                  <span className="text-xs text-ink-muted">to</span>
                  <Input
                    type="time"
                    value={hour.end_time}
                    onChange={(e) => updateHour(hour.day_of_week, { end_time: e.target.value })}
                    className="h-9 max-w-[8rem]"
                    aria-label={`${DAYS[hour.day_of_week]} end time`}
                  />
                </div>
              ) : (
                <span className="text-sm text-ink-muted">Day off</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {staff ? "Save changes" : "Add staff member"}
        </Button>
      </div>
    </form>
  );
}

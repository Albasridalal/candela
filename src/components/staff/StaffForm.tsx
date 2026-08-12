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
import { Branch, Service, Staff } from "@/lib/types/database.types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WorkingHourRow {
  day_of_week: number;
  is_working: boolean;
  start_time: string;
  end_time: string;
}

export function StaffForm({
  staff,
  branches,
  services,
  initialServiceIds = [],
  initialHours,
}: {
  staff?: Staff;
  branches: Branch[];
  services: Service[];
  initialServiceIds?: string[];
  initialHours?: WorkingHourRow[];
}) {
  const router = useRouter();
  const { show } = useToast();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hours, setHours] = useState<WorkingHourRow[]>(
    initialHours ??
      DAYS.map((_, i) => ({
        day_of_week: i,
        is_working: i !== 5,
        start_time: "10:00",
        end_time: "19:00",
      }))
  );

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
      branch_id: staff?.branch_id ?? branches[0]?.id ?? "",
      commission_percentage: staff?.commission_percentage ?? 15,
      employment_status: staff?.employment_status ?? "active",
      service_ids: initialServiceIds,
    },
  });

  const selectedServiceIds = watch("service_ids");

  function toggleService(id: string) {
    const set = new Set(selectedServiceIds);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    setValue("service_ids", Array.from(set));
  }

  function updateHour(day: number, patch: Partial<WorkingHourRow>) {
    setHours((prev) => prev.map((h) => (h.day_of_week === day ? { ...h, ...patch } : h)));
  }

  async function onSubmit(values: StaffFormValues) {
    setIsSubmitting(true);

    const payload = {
      full_name: values.full_name,
      phone: values.phone || null,
      email: values.email || null,
      job_title: values.job_title || null,
      branch_id: values.branch_id,
      commission_percentage: values.commission_percentage,
      employment_status: values.employment_status,
    };

    let staffId = staff?.id;
    if (staff) {
      await supabase.from("staff").update(payload).eq("id", staff.id);
    } else {
      const { data: profile } = await supabase.auth.getUser();
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", profile.user?.id)
        .single();
      const { data: inserted, error } = await supabase
        .from("staff")
        .insert({ ...payload, business_id: profileRow?.business_id })
        .select("id")
        .single();
      if (error || !inserted) {
        setIsSubmitting(false);
        return show("Couldn't create staff member.", "error");
      }
      staffId = inserted.id;
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
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-4">
      <FormField label="Full name" error={errors.full_name?.message}>
        <Input {...register("full_name")} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Phone" error={errors.phone?.message}>
          <Input {...register("phone")} />
        </FormField>
        <FormField label="Email" error={errors.email?.message}>
          <Input type="email" {...register("email")} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Job title" error={errors.job_title?.message}>
          <Input {...register("job_title")} placeholder="e.g. Hair Stylist" />
        </FormField>
        <FormField label="Branch" error={errors.branch_id?.message}>
          <Select {...register("branch_id")}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Commission %" error={errors.commission_percentage?.message}>
          <Input type="number" step="0.1" {...register("commission_percentage")} />
        </FormField>
        <FormField label="Status" error={errors.employment_status?.message}>
          <Select {...register("employment_status")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Services performed</p>
        <div className="flex flex-wrap gap-2">
          {services.map((s) => {
            const active = selectedServiceIds?.includes(s.id);
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => toggleService(s.id)}
                className={`rounded-pill border px-3 py-1.5 text-xs font-medium ${
                  active
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-border bg-surface text-ink-muted"
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Working hours</p>
        <div className="space-y-1.5">
          {hours.map((h) => (
            <div key={h.day_of_week} className="flex items-center gap-2">
              <label className="flex w-24 shrink-0 items-center gap-2 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={h.is_working}
                  onChange={(e) => updateHour(h.day_of_week, { is_working: e.target.checked })}
                />
                {DAYS[h.day_of_week]}
              </label>
              <Input
                type="time"
                disabled={!h.is_working}
                value={h.start_time}
                onChange={(e) => updateHour(h.day_of_week, { start_time: e.target.value })}
                className="h-9"
              />
              <span className="text-xs text-ink-muted">to</span>
              <Input
                type="time"
                disabled={!h.is_working}
                value={h.end_time}
                onChange={(e) => updateHour(h.day_of_week, { end_time: e.target.value })}
                className="h-9"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
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

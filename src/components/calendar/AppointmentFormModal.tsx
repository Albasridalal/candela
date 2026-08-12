"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Input, Textarea } from "@/components/ui/Input";
import { appointmentSchema, AppointmentFormValues } from "@/lib/validations/schemas";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { Branch, Customer, Service, Staff } from "@/lib/types/database.types";
import { APPOINTMENT_STATUSES } from "@/lib/types";
import { combineDateAndTime, computeEndTime, rangesOverlap, formatDateInput } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  branches: Branch[];
  defaultBranchId?: string;
  defaultDate?: string; // yyyy-MM-dd
  appointmentId?: string; // when editing
}

export function AppointmentFormModal({
  open,
  onClose,
  onSaved,
  branches,
  defaultBranchId,
  defaultDate,
  appointmentId,
}: Props) {
  const { show } = useToast();
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overlapError, setOverlapError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      branch_id: defaultBranchId ?? "",
      date: defaultDate ?? formatDateInput(new Date()),
      status: "confirmed",
      price: 0,
    },
  });

  const serviceId = watch("service_id");
  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId]
  );

  // Load reference data once the modal opens.
  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: c }, { data: sv }, { data: st }] = await Promise.all([
        supabase.from("customers").select("*").order("full_name"),
        supabase.from("services").select("*").eq("is_active", true).order("name"),
        supabase.from("staff").select("*").eq("employment_status", "active").order("full_name"),
      ]);
      setCustomers((c as Customer[]) ?? []);
      setServices((sv as Service[]) ?? []);
      setStaff((st as Staff[]) ?? []);
    })();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedService) setValue("price", selectedService.price);
  }, [selectedService, setValue]);

  useEffect(() => {
    if (!open) {
      reset();
      setOverlapError(null);
      return;
    }
    if (!appointmentId) return;

    (async () => {
      const { data: appt } = await supabase
        .from("appointments")
        .select(
          "branch_id, customer_id, staff_id, start_time, status, notes, appointment_services ( service_id, price )"
        )
        .eq("id", appointmentId)
        .single();
      if (!appt) return;
      const start = new Date(appt.start_time);
      const svc = (appt.appointment_services as { service_id: string; price: number }[])[0];
      reset({
        branch_id: appt.branch_id,
        customer_id: appt.customer_id,
        staff_id: appt.staff_id,
        service_id: svc?.service_id ?? "",
        price: svc?.price ?? 0,
        date: formatDateInput(start),
        start_time: start.toTimeString().slice(0, 5),
        status: appt.status,
        notes: appt.notes ?? "",
      });
    })();
  }, [open, appointmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function cancelAppointment() {
    if (!appointmentId) return;
    setIsSubmitting(true);
    await supabase.from("appointments").update({ status: "cancelled" }).eq("id", appointmentId);
    setIsSubmitting(false);
    show("Appointment cancelled");
    onSaved();
    onClose();
  }

  async function onSubmit(values: AppointmentFormValues) {
    setOverlapError(null);
    const service = services.find((s) => s.id === values.service_id);
    if (!service) return;

    const startIso = combineDateAndTime(values.date, values.start_time);
    const endIso = computeEndTime(startIso, service.duration_minutes);

    // Prevent obvious overlap for the same employee: fetch that staff
    // member's appointments on the same day and check for a time clash.
    const dayStart = combineDateAndTime(values.date, "00:00");
    const dayEnd = combineDateAndTime(values.date, "23:59");
    const { data: existing } = await supabase
      .from("appointments")
      .select("id, start_time, end_time, status")
      .eq("staff_id", values.staff_id)
      .neq("status", "cancelled")
      .gte("start_time", dayStart)
      .lte("start_time", dayEnd);

    const clash = (existing ?? []).some(
      (a) =>
        a.id !== appointmentId &&
        rangesOverlap(startIso, endIso, a.start_time, a.end_time)
    );
    if (clash) {
      setOverlapError("This staff member already has an appointment in that time slot.");
      return;
    }

    setIsSubmitting(true);
    const { data: branchRow } = await supabase
      .from("branches")
      .select("business_id")
      .eq("id", values.branch_id)
      .single();

    const payload = {
      business_id: branchRow?.business_id,
      branch_id: values.branch_id,
      customer_id: values.customer_id,
      staff_id: values.staff_id,
      start_time: startIso,
      end_time: endIso,
      status: values.status,
      notes: values.notes || null,
    };

    let savedAppointmentId = appointmentId;
    if (appointmentId) {
      const { error } = await supabase.from("appointments").update(payload).eq("id", appointmentId);
      if (error) {
        setIsSubmitting(false);
        if (error.code === "23P01") {
          setOverlapError("This staff member already has an appointment in that time slot.");
        } else {
          show("Couldn't save the appointment.", "error");
        }
        return;
      }
      await supabase.from("appointment_services").delete().eq("appointment_id", appointmentId);
    } else {
      const { data: inserted, error } = await supabase
        .from("appointments")
        .insert(payload)
        .select("id")
        .single();
      if (error || !inserted) {
        setIsSubmitting(false);
        if (error?.code === "23P01") {
          setOverlapError("This staff member already has an appointment in that time slot.");
        } else {
          show("Couldn't save the appointment.", "error");
        }
        return;
      }
      savedAppointmentId = inserted.id;
    }

    await supabase.from("appointment_services").insert({
      appointment_id: savedAppointmentId,
      service_id: service.id,
      price: values.price,
      duration_minutes: service.duration_minutes,
    });

    setIsSubmitting(false);
    show(appointmentId ? "Appointment updated" : "Appointment booked");
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={appointmentId ? "Edit Appointment" : "New Appointment"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Branch" error={errors.branch_id?.message}>
          <Select {...register("branch_id")}>
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Customer" error={errors.customer_id?.message}>
          <Select {...register("customer_id")}>
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Service" error={errors.service_id?.message}>
          <Select {...register("service_id")}>
            <option value="">Select service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.duration_minutes} min · {formatCurrency(s.price)})
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Staff" error={errors.staff_id?.message}>
          <Select {...register("staff_id")}>
            <option value="">Select staff</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date" error={errors.date?.message}>
            <Input type="date" {...register("date")} />
          </FormField>
          <FormField label="Start time" error={errors.start_time?.message}>
            <Input type="time" {...register("start_time")} />
          </FormField>
        </div>

        {selectedService && (
          <p className="-mt-2 text-xs text-ink-muted">
            End time is calculated automatically ({selectedService.duration_minutes} min duration).
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Price" error={errors.price?.message}>
            <Input type="number" step="0.001" {...register("price")} />
          </FormField>
          <FormField label="Status" error={errors.status?.message}>
            <Select {...register("status")}>
              {APPOINTMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label="Notes" error={errors.notes?.message}>
          <Textarea {...register("notes")} placeholder="Optional notes" />
        </FormField>

        {overlapError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{overlapError}</p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          {appointmentId ? (
            <Button
              type="button"
              variant="ghost"
              className="text-danger"
              onClick={cancelAppointment}
              isLoading={isSubmitting}
            >
              Cancel appointment
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {appointmentId ? "Save changes" : "Book appointment"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

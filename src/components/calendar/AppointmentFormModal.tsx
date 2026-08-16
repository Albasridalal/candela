"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Phone, Plus, Search, Trash2, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { appointmentSchema, AppointmentFormValues } from "@/lib/validations/schemas";
import { APPOINTMENT_STATUSES, AppointmentWithDetails } from "@/lib/types";
import { Customer, Service, Staff } from "@/lib/types/database.types";
import { formatCurrency } from "@/lib/utils/currency";
import { appointmentStatusConfig } from "@/lib/utils/status";
import { combineDateAndTime, rangesOverlap } from "@/lib/utils/date";
import {
  formatTimeLabel,
  minutesToTime,
  timeToMinutes,
  toSalonWallClock,
  todayInSalon,
} from "@/lib/utils/timezone";

export interface AppointmentSlot {
  dateKey: string;
  staffId: string | null;
  time: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  businessId: string;
  branchId: string;
  staff: Staff[];
  services: Service[];
  customers: Customer[];
  staffServices: { staff_id: string; service_id: string }[];
  onCustomerCreated: (customer: Customer) => void;
  /** Set when editing an existing appointment */
  appointment?: AppointmentWithDetails;
  /** Set when creating from a calendar slot */
  slot?: AppointmentSlot;
}

const emptyValues: AppointmentFormValues = {
  customer_id: "",
  service_id: "",
  staff_id: "",
  date: "",
  start_time: "",
  duration_minutes: 30,
  price: 0,
  status: "confirmed",
  notes: "",
};

export function AppointmentFormModal({
  open,
  onClose,
  onSaved,
  businessId,
  branchId,
  staff,
  services,
  customers,
  staffServices,
  onCustomerCreated,
  appointment,
  slot,
}: Props) {
  const supabase = createClient();
  const { show } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [customerQuery, setCustomerQuery] = useState("");
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [newCustomer, setNewCustomer] = useState<{ full_name: string; phone: string } | null>(null);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // Built during render, not in an effect: an effect that resets the form runs
  // *after* the modal is on screen, so a fast edit could be silently reverted.
  const formValues = useMemo<AppointmentFormValues>(() => {
    if (!open) return emptyValues;

    if (appointment) {
      const start = toSalonWallClock(appointment.start_time);
      return {
        customer_id: appointment.customer_id,
        service_id: appointment.service_id ?? "",
        staff_id: appointment.staff_id,
        date: start.date,
        start_time: start.time,
        duration_minutes: appointment.service_duration_minutes,
        price: appointment.service_price,
        status: appointment.status,
        notes: appointment.notes ?? "",
      };
    }

    return {
      ...emptyValues,
      staff_id: slot?.staffId ?? "",
      date: slot?.dateKey ?? todayInSalon(),
      start_time: slot?.time ?? "10:00",
    };
  }, [open, appointment, slot]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: emptyValues,
    values: formValues,
  });

  const customerId = watch("customer_id");
  const serviceId = watch("service_id");
  const startTime = watch("start_time");
  const durationMinutes = watch("duration_minutes");

  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;
  const selectedService = services.find((s) => s.id === serviceId) ?? null;

  const eligibleStaffIds = useMemo(
    () => new Set(staffServices.filter((s) => s.service_id === serviceId).map((s) => s.staff_id)),
    [staffServices, serviceId]
  );

  const endTimeLabel = useMemo(() => {
    if (!startTime || !durationMinutes) return null;
    const end = timeToMinutes(startTime) + Number(durationMinutes);
    if (end >= 24 * 60) return null;
    return formatTimeLabel(minutesToTime(end));
  }, [startTime, durationMinutes]);

  // Reset the bits of UI state that live outside the form each time it opens.
  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setCustomerQuery("");
    setNewCustomer(null);
    setShowCustomerPicker(!appointment);
  }, [open, appointment]);

  // Picking a service fills in its duration and price (both stay editable).
  function selectService(id: string) {
    setValue("service_id", id, { shouldValidate: true });
    const service = services.find((s) => s.id === id);
    if (service) {
      setValue("duration_minutes", service.duration_minutes);
      setValue("price", service.price);
    }
  }

  const filteredCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    if (!query) return customers.slice(0, 8);
    return customers
      .filter(
        (c) =>
          c.full_name.toLowerCase().includes(query) ||
          (c.phone ?? "").replace(/\s/g, "").includes(query.replace(/\s/g, ""))
      )
      .slice(0, 8);
  }, [customers, customerQuery]);

  async function createCustomer() {
    if (!newCustomer) return;
    if (newCustomer.full_name.trim().length < 2 || newCustomer.phone.trim().length < 6) {
      setFormError("New customer needs a name and a phone number.");
      return;
    }
    setIsCreatingCustomer(true);
    const { data, error } = await supabase
      .from("customers")
      .insert({
        business_id: businessId,
        full_name: newCustomer.full_name.trim(),
        phone: newCustomer.phone.trim(),
      })
      .select()
      .single();
    setIsCreatingCustomer(false);

    if (error || !data) {
      setFormError(
        error?.code === "23505"
          ? "A customer with that phone number already exists — search for them instead."
          : "Couldn't create that customer."
      );
      return;
    }

    onCustomerCreated(data as Customer);
    setValue("customer_id", data.id, { shouldValidate: true });
    setNewCustomer(null);
    setShowCustomerPicker(false);
    setFormError(null);
  }

  async function onSubmit(values: AppointmentFormValues) {
    setFormError(null);
    setIsSubmitting(true);

    const startIso = combineDateAndTime(values.date, values.start_time);
    const endIso = new Date(
      new Date(startIso).getTime() + Number(values.duration_minutes) * 60_000
    ).toISOString();

    // Same-staff double-booking check before writing. The database exclusion
    // constraint is the real guarantee; this exists to give a clear message.
    if (values.status !== "cancelled") {
      const { data: existing } = await supabase
        .from("appointments")
        .select("id, start_time, end_time")
        .eq("staff_id", values.staff_id)
        .neq("status", "cancelled")
        .gte("start_time", new Date(new Date(startIso).getTime() - 12 * 3600_000).toISOString())
        .lte("start_time", new Date(new Date(startIso).getTime() + 12 * 3600_000).toISOString());

      const clash = (existing ?? []).some(
        (a) => a.id !== appointment?.id && rangesOverlap(startIso, endIso, a.start_time, a.end_time)
      );
      if (clash) {
        setIsSubmitting(false);
        setFormError("That staff member already has an appointment in this time slot.");
        return;
      }
    }

    const payload = {
      business_id: businessId,
      branch_id: branchId,
      customer_id: values.customer_id,
      staff_id: values.staff_id,
      start_time: startIso,
      end_time: endIso,
      status: values.status,
      notes: values.notes || null,
    };

    let appointmentId = appointment?.id;

    if (appointment) {
      const { error } = await supabase.from("appointments").update(payload).eq("id", appointment.id);
      if (error) {
        setIsSubmitting(false);
        setFormError(
          error.code === "23P01"
            ? "That staff member already has an appointment in this time slot."
            : "Couldn't save the appointment."
        );
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("appointments")
        .insert(payload)
        .select("id")
        .single();
      if (error || !data) {
        setIsSubmitting(false);
        setFormError(
          error?.code === "23P01"
            ? "That staff member already has an appointment in this time slot."
            : "Couldn't save the appointment."
        );
        return;
      }
      appointmentId = data.id;
    }

    if (appointmentId) {
      await supabase.from("appointment_services").delete().eq("appointment_id", appointmentId);
      const { error: serviceError } = await supabase.from("appointment_services").insert({
        appointment_id: appointmentId,
        service_id: values.service_id,
        price: values.price,
        duration_minutes: Number(values.duration_minutes),
      });
      if (serviceError) {
        setIsSubmitting(false);
        setFormError("The appointment was saved but the service didn't attach. Try again.");
        return;
      }
    }

    setIsSubmitting(false);
    show(appointment ? "Appointment updated" : "Appointment booked");
    onSaved();
    onClose();
  }

  async function cancelAppointment() {
    if (!appointment) return;
    setIsSubmitting(true);
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointment.id);
    setIsSubmitting(false);
    if (error) return show("Couldn't cancel the appointment.", "error");
    show("Appointment cancelled");
    onSaved();
    onClose();
  }

  async function deleteAppointment() {
    if (!appointment) return;
    setIsSubmitting(true);
    await supabase.from("appointment_services").delete().eq("appointment_id", appointment.id);
    const { error } = await supabase.from("appointments").delete().eq("id", appointment.id);
    setIsSubmitting(false);
    setConfirmDelete(false);
    if (error) return show("Couldn't delete the appointment.", "error");
    show("Appointment deleted");
    onSaved();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={appointment ? "Edit appointment" : "New appointment"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register("customer_id")} />

        {/* Customer ------------------------------------------------------ */}
        <div>
          <p className="mb-1.5 block text-sm font-medium text-ink">Customer</p>

          {selectedCustomer && !showCustomerPicker ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{selectedCustomer.full_name}</p>
                <p className="flex items-center gap-1 truncate text-xs text-ink-muted">
                  <Phone className="h-3 w-3" /> {selectedCustomer.phone || "No phone on file"}
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowCustomerPicker(true)}>
                Change
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  autoComplete="off"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Search by name or phone"
                  className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>

              <div className="mt-2 max-h-44 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <button
                    type="button"
                    key={customer.id}
                    onClick={() => {
                      setValue("customer_id", customer.id, { shouldValidate: true });
                      setShowCustomerPicker(false);
                      setNewCustomer(null);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left hover:bg-surface-subtle"
                  >
                    <span className="truncate text-sm text-ink">{customer.full_name}</span>
                    <span className="shrink-0 text-xs text-ink-muted">{customer.phone}</span>
                  </button>
                ))}
                {filteredCustomers.length === 0 && (
                  <p className="px-2 py-3 text-xs text-ink-muted">No customer matches that search.</p>
                )}
              </div>

              {newCustomer ? (
                <div className="mt-2 space-y-2 rounded-lg border border-border p-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-ink">New customer</p>
                    <button
                      type="button"
                      onClick={() => setNewCustomer(null)}
                      className="rounded p-1 text-ink-muted hover:bg-surface-subtle"
                      aria-label="Cancel new customer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Input
                    placeholder="Full name"
                    value={newCustomer.full_name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
                    className="h-10"
                  />
                  <Input
                    placeholder="Phone number"
                    inputMode="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="h-10"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    isLoading={isCreatingCustomer}
                    onClick={createCustomer}
                  >
                    Save customer
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setNewCustomer({
                      full_name: /\d/.test(customerQuery) ? "" : customerQuery,
                      phone: /\d/.test(customerQuery) ? customerQuery : "",
                    })
                  }
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-brand-700 hover:bg-brand-50"
                >
                  <Plus className="h-4 w-4" /> Add new customer
                </button>
              )}
            </div>
          )}
          {errors.customer_id && (
            <p className="mt-1 text-xs text-danger">{errors.customer_id.message}</p>
          )}
        </div>

        {/* Service ------------------------------------------------------- */}
        <FormField label="Service" error={errors.service_id?.message}>
          <Select value={serviceId} onChange={(e) => selectService(e.target.value)}>
            <option value="">Select service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · {service.duration_minutes} min · {formatCurrency(service.price)}
              </option>
            ))}
          </Select>
        </FormField>

        {/* Staff --------------------------------------------------------- */}
        <FormField label="Staff member" error={errors.staff_id?.message}>
          <Select {...register("staff_id")}>
            <option value="">Select staff</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name}
                {serviceId && !eligibleStaffIds.has(member.id) ? " (not assigned to this service)" : ""}
              </option>
            ))}
          </Select>
        </FormField>

        {/* When ---------------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date" error={errors.date?.message}>
            <Input type="date" {...register("date")} />
          </FormField>
          <FormField label="Start time" error={errors.start_time?.message}>
            <Input type="time" step={300} {...register("start_time")} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Duration (minutes)" error={errors.duration_minutes?.message}>
            <Input type="number" step={5} min={5} {...register("duration_minutes")} />
          </FormField>
          <FormField label="Price" error={errors.price?.message}>
            <Input type="number" step="0.001" min="0" {...register("price")} />
          </FormField>
        </div>

        {endTimeLabel && (
          <p className="-mt-2 text-xs text-ink-muted">
            Ends at <span className="font-medium text-ink">{endTimeLabel}</span>
            {selectedService ? ` · ${selectedService.name} takes ${selectedService.duration_minutes} min by default` : ""}
          </p>
        )}

        {/* Status -------------------------------------------------------- */}
        <FormField label="Booking status" error={errors.status?.message}>
          <Select {...register("status")}>
            {APPOINTMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {appointmentStatusConfig[status].label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Notes" error={errors.notes?.message}>
          <Textarea {...register("notes")} placeholder="Allergies, preferences, requests…" />
        </FormField>

        {appointment?.source === "online" && (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
            Booked online by the customer
            {appointment.booking_reference ? ` · ref ${appointment.booking_reference}` : ""}
          </p>
        )}

        {formError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{formError}</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex gap-1">
            {appointment && appointment.status !== "cancelled" && (
              <Button type="button" variant="ghost" className="text-danger" onClick={cancelAppointment}>
                Cancel booking
              </Button>
            )}
            {appointment && (
              <Button
                type="button"
                variant="ghost"
                className="text-ink-muted"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete appointment"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {appointment ? "Save changes" : "Book appointment"}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteAppointment}
        isLoading={isSubmitting}
        title="Delete appointment?"
        description="This removes the appointment completely. Cancelling instead keeps it in the customer's history."
      />
    </Modal>
  );
}

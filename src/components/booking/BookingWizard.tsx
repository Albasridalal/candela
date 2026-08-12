"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sparkles,
  ChevronLeft,
  Clock,
  Check,
  Loader2,
  CalendarDays,
  User,
  Copy,
} from "lucide-react";
import { format, addDays, isSameDay } from "date-fns";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import {
  publicBookingCustomerSchema,
  PublicBookingCustomerValues,
} from "@/lib/validations/schemas";

interface BootstrapData {
  business: { id: string; name: string; currency: string };
  branches: { id: string; name: string }[];
  categories: { id: string; name: string; sort_order: number }[];
  services: {
    id: string;
    category_id: string | null;
    name: string;
    description: string | null;
    duration_minutes: number;
    price: number;
  }[];
  staff: { id: string; full_name: string; profile_image_url: string | null; branch_id: string | null }[];
  staffServices: { staff_id: string; service_id: string }[];
}

type Step = "category" | "service" | "staff" | "date" | "time" | "details" | "confirm" | "done";

const STEP_ORDER: Step[] = ["category", "service", "staff", "date", "time", "details", "confirm"];

export function BookingWizard() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("category");

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffChoice, setStaffChoice] = useState<string | null>(null); // staff id or "any"
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [resolvedStaffId, setResolvedStaffId] = useState<string | null>(null);

  const [slots, setSlots] = useState<{ time: string; staffId: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    reference: string;
    service: { name: string; price: number; duration_minutes: number };
    staffName: string;
    date: string;
    time: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/public/bootstrap")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setLoadError(json.error);
        else setData(json);
      })
      .catch(() => setLoadError("Couldn't load booking information. Please try again."));
  }, []);

  const service = useMemo(() => data?.services.find((s) => s.id === serviceId) ?? null, [data, serviceId]);
  const branch = data?.branches[0] ?? null;

  const eligibleStaff = useMemo(() => {
    if (!data || !serviceId) return [];
    const staffIds = new Set(
      data.staffServices.filter((ss) => ss.service_id === serviceId).map((ss) => ss.staff_id)
    );
    return data.staff.filter((s) => staffIds.has(s.id));
  }, [data, serviceId]);

  const staffName = useMemo(() => {
    if (!resolvedStaffId) return "";
    return data?.staff.find((s) => s.id === resolvedStaffId)?.full_name ?? "";
  }, [data, resolvedStaffId]);

  // Load slots when we reach the time step.
  useEffect(() => {
    if (step !== "time" || !branch || !serviceId || !staffChoice || !date) return;
    setSlotsLoading(true);
    setTime(null);
    const params = new URLSearchParams({
      branchId: branch.id,
      serviceId,
      staffId: staffChoice,
      date,
    });
    fetch(`/api/public/availability?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => setSlots(json.slots ?? []))
      .finally(() => setSlotsLoading(false));
  }, [step, branch, serviceId, staffChoice, date]);

  function goTo(next: Step) {
    setStep(next);
  }

  function goBack() {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  }

  function selectTime(t: string, staffIdForSlot: string) {
    setTime(t);
    setResolvedStaffId(staffIdForSlot);
    goTo("details");
  }

  const form = useForm<PublicBookingCustomerValues>({
    resolver: zodResolver(publicBookingCustomerSchema),
    defaultValues: { full_name: "", phone: "", email: "", notes: "" },
  });

  async function submitBooking(customer: PublicBookingCustomerValues) {
    if (!branch || !service || !resolvedStaffId || !date || !time) return;
    setSubmitting(true);
    setSubmitError(null);

    const res = await fetch("/api/public/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId: branch.id,
        serviceId: service.id,
        staffId: resolvedStaffId,
        date,
        time,
        customer,
      }),
    });
    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setSubmitError(json.error ?? "Something went wrong. Please try again.");
      if (res.status === 409) {
        // slot taken — bounce back to time selection with a refreshed list
        goTo("time");
      }
      return;
    }

    setConfirmation(json);
    goTo("done");
  }

  if (loadError) {
    return <CenteredMessage title="Booking unavailable" description={loadError} />;
  }
  if (!data) {
    return <CenteredMessage title="Loading…" icon={Loader2} spin />;
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-8">
      <header className="mb-6 flex items-center gap-3">
        {step !== "category" && step !== "done" && (
          <button
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
            {data.business.name}
          </p>
          <h1 className="text-lg font-semibold text-ink">Book an appointment</h1>
        </div>
      </header>

      {step !== "done" && <StepProgress step={step} />}

      {step === "category" && (
        <StepList
          title="What are you looking for?"
          items={data.categories.map((c) => ({ id: c.id, label: c.name }))}
          onSelect={(id) => {
            setCategoryId(id);
            goTo("service");
          }}
        />
      )}

      {step === "service" && (
        <div>
          <h2 className="mb-3 text-base font-medium text-ink">Select a service</h2>
          <div className="space-y-2">
            {data.services
              .filter((s) => s.category_id === categoryId)
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setServiceId(s.id);
                    setStaffChoice(null);
                    goTo("staff");
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 text-left shadow-card active:bg-surface-subtle"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{s.name}</p>
                    {s.description && (
                      <p className="mt-0.5 truncate text-xs text-ink-muted">{s.description}</p>
                    )}
                    <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                      <Clock className="h-3 w-3" /> {s.duration_minutes} min
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-brand-700">
                    {formatCurrency(s.price)}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}

      {step === "staff" && (
        <div>
          <h2 className="mb-3 text-base font-medium text-ink">Choose your staff member</h2>
          <div className="space-y-2">
            <button
              onClick={() => {
                setStaffChoice("any");
                goTo("date");
              }}
              className="flex w-full items-center gap-3 rounded-card border border-border bg-surface p-4 text-left shadow-card active:bg-surface-subtle"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                <Sparkles className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Any available staff</p>
                <p className="text-xs text-ink-muted">We&apos;ll match you with the first opening</p>
              </div>
            </button>
            {eligibleStaff.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setStaffChoice(s.id);
                  goTo("date");
                }}
                className="flex w-full items-center gap-3 rounded-card border border-border bg-surface p-4 text-left shadow-card active:bg-surface-subtle"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                  {s.full_name.slice(0, 1).toUpperCase()}
                </div>
                <p className="text-sm font-medium text-ink">{s.full_name}</p>
              </button>
            ))}
            {eligibleStaff.length === 0 && (
              <p className="text-sm text-ink-muted">
                No staff are currently assigned to this service — you can still request &quot;Any
                available staff&quot; above.
              </p>
            )}
          </div>
        </div>
      )}

      {step === "date" && (
        <DateStep
          onSelect={(d) => {
            setDate(d);
            goTo("time");
          }}
        />
      )}

      {step === "time" && (
        <div>
          <h2 className="mb-1 text-base font-medium text-ink">Choose a time</h2>
          <p className="mb-3 text-xs text-ink-muted">
            {date && format(new Date(`${date}T00:00:00`), "EEEE, MMMM d")}
          </p>
          {slotsLoading ? (
            <p className="py-10 text-center text-sm text-ink-muted">Checking availability…</p>
          ) : slots.length === 0 ? (
            <div className="rounded-card border border-dashed border-border p-6 text-center">
              <p className="text-sm text-ink">No times available on this date.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => goTo("date")}>
                Choose another date
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((s) => (
                <button
                  key={s.time + s.staffId}
                  onClick={() => selectTime(s.time, s.staffId)}
                  className="rounded-xl border border-border bg-surface py-2.5 text-sm font-medium text-ink shadow-subtle active:bg-brand-50 active:border-brand-400"
                >
                  {format(new Date(`2000-01-01T${s.time}:00`), "h:mm a")}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "details" && (
        <form onSubmit={form.handleSubmit(() => goTo("confirm"))} className="space-y-4">
          <h2 className="text-base font-medium text-ink">Your information</h2>
          <FormField label="Full name" error={form.formState.errors.full_name?.message}>
            <Input {...form.register("full_name")} placeholder="Your name" />
          </FormField>
          <FormField label="Mobile number" error={form.formState.errors.phone?.message}>
            <Input {...form.register("phone")} placeholder="+965 9000 0000" inputMode="tel" />
          </FormField>
          <FormField label="Email (optional)" error={form.formState.errors.email?.message}>
            <Input type="email" {...form.register("email")} placeholder="you@example.com" />
          </FormField>
          <FormField label="Notes (optional)" error={form.formState.errors.notes?.message}>
            <Textarea {...form.register("notes")} placeholder="Anything we should know?" />
          </FormField>
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      )}

      {step === "confirm" && service && branch && date && time && (
        <div>
          <h2 className="mb-3 text-base font-medium text-ink">Confirm your booking</h2>
          <div className="space-y-3 rounded-card border border-border bg-surface p-4 shadow-card">
            <SummaryRow icon={Sparkles} label="Service" value={service.name} />
            <SummaryRow icon={User} label="Staff" value={staffName || "Any available"} />
            <SummaryRow
              icon={CalendarDays}
              label="Date & time"
              value={`${format(new Date(`${date}T00:00:00`), "EEE, MMM d")} at ${format(
                new Date(`2000-01-01T${time}:00`),
                "h:mm a"
              )}`}
            />
            <SummaryRow icon={Clock} label="Duration" value={`${service.duration_minutes} min`} />
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-medium text-ink">Total</span>
              <span className="text-base font-semibold text-brand-700">
                {formatCurrency(service.price)}
              </span>
            </div>
          </div>

          {submitError && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{submitError}</p>
          )}

          <Button
            className="mt-4 w-full"
            isLoading={submitting}
            onClick={() => submitBooking(form.getValues())}
          >
            Confirm booking
          </Button>
          <p className="mt-2 text-center text-xs text-ink-muted">
            No payment required now — you&apos;ll pay at the salon.
          </p>
        </div>
      )}

      {step === "done" && confirmation && <ConfirmationScreen confirmation={confirmation} />}
    </div>
  );
}

function StepProgress({ step }: { step: Step }) {
  const idx = STEP_ORDER.indexOf(step);
  return (
    <div className="mb-6 flex gap-1">
      {STEP_ORDER.map((s, i) => (
        <div
          key={s}
          className={cn("h-1 flex-1 rounded-full", i <= idx ? "bg-brand-500" : "bg-surface-subtle border border-border")}
        />
      ))}
    </div>
  );
}

function StepList({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: { id: string; label: string }[];
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-3 text-base font-medium text-ink">{title}</h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className="rounded-card border border-border bg-surface p-4 text-left shadow-card active:bg-brand-50 active:border-brand-400"
          >
            <p className="text-sm font-medium text-ink">{item.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function DateStep({ onSelect }: { onSelect: (date: string) => void }) {
  const today = new Date();
  const quickDays = Array.from({ length: 10 }, (_, i) => addDays(today, i));
  const [customDate, setCustomDate] = useState("");

  return (
    <div>
      <h2 className="mb-3 text-base font-medium text-ink">Choose a date</h2>
      <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {quickDays.map((d) => (
          <button
            key={d.toISOString()}
            onClick={() => onSelect(format(d, "yyyy-MM-dd"))}
            className={cn(
              "flex shrink-0 flex-col items-center rounded-xl border border-border bg-surface px-3 py-2.5",
              isSameDay(d, today) && "border-brand-400"
            )}
          >
            <span className="text-[11px] text-ink-muted">{format(d, "EEE")}</span>
            <span className="text-sm font-semibold text-ink">{format(d, "d")}</span>
          </button>
        ))}
      </div>
      <FormField label="Or pick a specific date">
        <Input
          type="date"
          min={format(today, "yyyy-MM-dd")}
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
        />
      </FormField>
      <Button className="mt-3 w-full" disabled={!customDate} onClick={() => onSelect(customDate)}>
        Continue
      </Button>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-brand-600" />
      <div className="min-w-0">
        <p className="text-xs text-ink-muted">{label}</p>
        <p className="truncate text-sm font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}

function ConfirmationScreen({
  confirmation,
}: {
  confirmation: {
    reference: string;
    service: { name: string; price: number; duration_minutes: number };
    staffName: string;
    date: string;
    time: string;
  };
}) {
  const [copied, setCopied] = useState(false);

  function copyReference() {
    navigator.clipboard?.writeText(confirmation.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-center pt-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
        <Check className="h-8 w-8 text-brand-600" />
      </div>
      <h2 className="text-lg font-semibold text-ink">Booking confirmed</h2>
      <p className="mt-1 text-sm text-ink-muted">We look forward to seeing you.</p>

      <button
        onClick={copyReference}
        className="mt-5 flex items-center gap-2 rounded-pill border border-border bg-surface px-4 py-2"
      >
        <span className="text-sm font-mono font-semibold text-ink">{confirmation.reference}</span>
        <Copy className="h-3.5 w-3.5 text-ink-muted" />
      </button>
      {copied && <p className="mt-1 text-xs text-success">Copied</p>}

      <div className="mt-6 w-full space-y-3 rounded-card border border-border bg-surface p-4 text-left shadow-card">
        <SummaryRow icon={Sparkles} label="Service" value={confirmation.service.name} />
        <SummaryRow icon={User} label="Staff" value={confirmation.staffName} />
        <SummaryRow
          icon={CalendarDays}
          label="Date & time"
          value={`${format(new Date(`${confirmation.date}T00:00:00`), "EEE, MMM d")} at ${format(
            new Date(`2000-01-01T${confirmation.time}:00`),
            "h:mm a"
          )}`}
        />
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm font-medium text-ink">Total</span>
          <span className="text-base font-semibold text-brand-700">
            {formatCurrency(confirmation.service.price)}
          </span>
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-muted">
        Keep your reference number handy in case you need to reach the salon about this booking.
      </p>
    </div>
  );
}

function CenteredMessage({
  title,
  description,
  icon: Icon,
  spin,
}: {
  title: string;
  description?: string;
  icon?: typeof Loader2;
  spin?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
      {Icon && <Icon className={cn("h-6 w-6 text-brand-600", spin && "animate-spin")} />}
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="text-sm text-ink-muted">{description}</p>}
    </div>
  );
}

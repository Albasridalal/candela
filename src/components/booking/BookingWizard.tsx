"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Sparkles,
  User,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import {
  addDaysToKey,
  dayOfWeekForKey,
  formatDateKeyLong,
  formatTimeLabel,
  monthShort,
  todayInSalon,
  weekdayShort,
} from "@/lib/utils/timezone";
import {
  publicBookingCustomerSchema,
  PublicBookingCustomerValues,
} from "@/lib/validations/schemas";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAYS_VISIBLE = 12;
const DAYS_AHEAD = 45;

interface BootstrapData {
  business: { id: string; name: string; currency: string };
  branches: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    opening_hours: Record<string, { open: string; close: string } | undefined> | null;
  }[];
  categories: { id: string; name: string; sort_order: number }[];
  services: {
    id: string;
    category_id: string | null;
    name: string;
    description: string | null;
    duration_minutes: number;
    price: number;
  }[];
  staff: { id: string; full_name: string; job_title: string | null; branch_id: string | null }[];
  staffServices: { staff_id: string; service_id: string }[];
}

interface Confirmation {
  reference: string;
  service: { name: string; price: number; duration_minutes: number };
  staffName: string;
  date: string;
  time: string;
}

type Step = "service" | "staff" | "date" | "time" | "details" | "confirm" | "done";

const STEPS: Step[] = ["service", "staff", "date", "time", "details", "confirm"];
const STEP_TITLES: Record<Step, string> = {
  service: "Choose your treatment",
  staff: "Who would you like?",
  date: "Pick a day",
  time: "Pick a time",
  details: "Your details",
  confirm: "Review your booking",
  done: "You're booked",
};

export function BookingWizard() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("service");

  const [categoryId, setCategoryId] = useState<string | "all">("all");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffChoice, setStaffChoice] = useState<string | null>(null); // staff id or "any"
  const [date, setDate] = useState<string | null>(null);
  const [showAllDates, setShowAllDates] = useState(false);
  const [time, setTime] = useState<string | null>(null);
  const [resolvedStaffId, setResolvedStaffId] = useState<string | null>(null);

  const [slots, setSlots] = useState<{ time: string; staffId: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const form = useForm<PublicBookingCustomerValues>({
    resolver: zodResolver(publicBookingCustomerSchema),
    defaultValues: { full_name: "", phone: "", email: "", notes: "" },
  });

  useEffect(() => {
    fetch("/api/public/bootstrap")
      .then((response) => response.json())
      .then((json) => {
        if (json.error) setLoadError(json.error);
        else setData(json);
      })
      .catch(() => setLoadError("We couldn't load the booking page. Please try again."));
  }, []);

  const branch = data?.branches[0] ?? null;
  const service = useMemo(
    () => data?.services.find((s) => s.id === serviceId) ?? null,
    [data, serviceId]
  );

  const eligibleStaff = useMemo(() => {
    if (!data || !serviceId) return [];
    const ids = new Set(
      data.staffServices.filter((link) => link.service_id === serviceId).map((l) => l.staff_id)
    );
    return data.staff.filter((member) => ids.has(member.id));
  }, [data, serviceId]);

  const staffName = useMemo(
    () => data?.staff.find((s) => s.id === resolvedStaffId)?.full_name ?? "",
    [data, resolvedStaffId]
  );

  /** Days the salon is open, for the date picker. */
  const openDays = useMemo(() => {
    const today = todayInSalon();
    return Array.from({ length: DAYS_AHEAD }, (_, i) => addDaysToKey(today, i)).filter((key) => {
      const hours = branch?.opening_hours?.[DAY_KEYS[dayOfWeekForKey(key)]];
      return !!hours;
    });
  }, [branch]);

  useEffect(() => {
    if (step !== "time" || !branch || !serviceId || !staffChoice || !date) return;
    setSlotsLoading(true);
    setTime(null);
    const params = new URLSearchParams({ branchId: branch.id, serviceId, staffId: staffChoice, date });
    fetch(`/api/public/availability?${params.toString()}`)
      .then((response) => response.json())
      .then((json) => setSlots(json.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [step, branch, serviceId, staffChoice, date]);

  function goBack() {
    const index = STEPS.indexOf(step);
    if (index > 0) setStep(STEPS[index - 1]);
  }

  async function submitBooking(customer: PublicBookingCustomerValues) {
    if (!branch || !service || !resolvedStaffId || !date || !time) return;
    setSubmitting(true);
    setSubmitError(null);

    const response = await fetch("/api/public/book", {
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
    const json = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      setSubmitError(json.error ?? "Something went wrong. Please try again.");
      if (response.status === 409) setStep("time");
      return;
    }

    setConfirmation(json as Confirmation);
    setStep("done");
  }

  if (loadError) return <CenteredMessage title="Booking unavailable" description={loadError} />;
  if (!data) return <CenteredMessage title="Just a moment…" loading />;

  const visibleServices =
    categoryId === "all"
      ? data.services
      : data.services.filter((s) => s.category_id === categoryId);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-16 pt-8">
      <header className="mb-7">
        <div className="flex items-center gap-3">
          {step !== "service" && step !== "done" && (
            <button
              onClick={goBack}
              aria-label="Back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blush-200 bg-white/70 text-blush-700 transition-colors active:bg-blush-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.2em] text-blush-500">
              {data.business.name}
            </p>
            <h1 className="font-display text-2xl leading-tight text-blush-900">
              {STEP_TITLES[step]}
            </h1>
          </div>
        </div>

        {step !== "done" && (
          <div className="mt-5 flex gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={cn(
                  "h-[3px] flex-1 rounded-full transition-colors",
                  i <= STEPS.indexOf(step) ? "bg-blush-400" : "bg-blush-100"
                )}
              />
            ))}
          </div>
        )}
      </header>

      {/* Service ---------------------------------------------------------- */}
      {step === "service" && (
        <div>
          <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <Chip active={categoryId === "all"} onClick={() => setCategoryId("all")}>
              All
            </Chip>
            {data.categories.map((category) => (
              <Chip
                key={category.id}
                active={categoryId === category.id}
                onClick={() => setCategoryId(category.id)}
              >
                {category.name}
              </Chip>
            ))}
          </div>

          <div className="space-y-3">
            {visibleServices.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setServiceId(item.id);
                  setStaffChoice(null);
                  setStep("staff");
                }}
                className="flex w-full items-center justify-between gap-4 rounded-3xl border border-blush-100 bg-white p-5 text-left shadow-[0_2px_14px_-8px_rgba(138,68,55,0.35)] transition-all active:scale-[0.99] active:border-blush-300"
              >
                <span className="min-w-0">
                  <span className="block font-display text-lg leading-snug text-blush-900">
                    {item.name}
                  </span>
                  {item.description && (
                    <span className="mt-0.5 block text-sm leading-snug text-blush-700/70">
                      {item.description}
                    </span>
                  )}
                  <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-blush-600">
                    <Clock className="h-3.5 w-3.5" /> {item.duration_minutes} min
                  </span>
                </span>
                <span className="shrink-0 font-display text-lg text-blush-800">
                  {formatCurrency(item.price)}
                </span>
              </button>
            ))}
            {visibleServices.length === 0 && (
              <p className="rounded-3xl border border-dashed border-blush-200 p-8 text-center text-sm text-blush-700/70">
                No treatments in this category yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Staff ------------------------------------------------------------ */}
      {step === "staff" && (
        <div className="space-y-3">
          <SelectCard
            title="Any available"
            subtitle="We'll match you with the earliest opening"
            initials="✨"
            onClick={() => {
              setStaffChoice("any");
              setStep("date");
            }}
          />
          {eligibleStaff.map((member) => (
            <SelectCard
              key={member.id}
              title={member.full_name}
              subtitle={member.job_title ?? undefined}
              initials={member.full_name.slice(0, 1).toUpperCase()}
              onClick={() => {
                setStaffChoice(member.id);
                setStep("date");
              }}
            />
          ))}
          {eligibleStaff.length === 0 && (
            <p className="rounded-3xl border border-dashed border-blush-200 p-6 text-center text-sm text-blush-700/70">
              No one is assigned to this treatment yet — choose &ldquo;Any available&rdquo; and the
              salon will confirm.
            </p>
          )}
        </div>
      )}

      {/* Date ------------------------------------------------------------- */}
      {step === "date" && (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {openDays.slice(0, showAllDates ? openDays.length : DAYS_VISIBLE).map((key) => {
            const day = Number(key.slice(8));
            const isToday = key === todayInSalon();
            return (
              <button
                key={key}
                onClick={() => {
                  setDate(key);
                  setStep("time");
                }}
                className={cn(
                  "flex flex-col items-center rounded-2xl border bg-white py-3 transition-all active:scale-[0.98]",
                  isToday ? "border-blush-300" : "border-blush-100"
                )}
              >
                <span className="text-[11px] uppercase tracking-wide text-blush-500">
                  {weekdayShort(key)}
                </span>
                <span className="font-display text-xl text-blush-900">{day}</span>
                <span className="text-[11px] text-blush-500">{monthShort(key)}</span>
              </button>
            );
          })}
          {openDays.length === 0 && (
            <p className="col-span-full rounded-3xl border border-dashed border-blush-200 p-6 text-center text-sm text-blush-700/70">
              The salon hasn&apos;t published its opening hours yet.
            </p>
          )}
          {!showAllDates && openDays.length > DAYS_VISIBLE && (
            <button
              onClick={() => setShowAllDates(true)}
              className="col-span-full mt-1 rounded-full border border-blush-200 bg-white py-3 text-sm font-medium text-blush-700"
            >
              Show more dates
            </button>
          )}
        </div>
      )}

      {/* Time ------------------------------------------------------------- */}
      {step === "time" && (
        <div>
          <p className="mb-4 text-sm text-blush-700/80">{date && formatDateKeyLong(date)}</p>
          {slotsLoading ? (
            <div className="flex flex-col items-center gap-2 py-14 text-blush-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm">Finding available times…</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-blush-200 p-8 text-center">
              <p className="font-display text-lg text-blush-900">Fully booked</p>
              <p className="mt-1 text-sm text-blush-700/70">
                There are no openings left on this day.
              </p>
              <button
                onClick={() => setStep("date")}
                className="mt-4 rounded-full bg-blush-600 px-5 py-2.5 text-sm font-medium text-white"
              >
                Choose another day
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {slots.map((slot) => (
                <button
                  key={slot.time + slot.staffId}
                  onClick={() => {
                    setTime(slot.time);
                    setResolvedStaffId(slot.staffId);
                    setStep("details");
                  }}
                  className="rounded-2xl border border-blush-100 bg-white py-3 text-sm font-medium text-blush-900 transition-all active:scale-[0.98] active:border-blush-400 active:bg-blush-50"
                >
                  {formatTimeLabel(slot.time)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Details ---------------------------------------------------------- */}
      {step === "details" && (
        <form onSubmit={form.handleSubmit(() => setStep("confirm"))} className="space-y-4">
          <Field label="Full name" error={form.formState.errors.full_name?.message}>
            <input
              {...form.register("full_name")}
              placeholder="Your name"
              autoComplete="name"
              className={inputClass}
            />
          </Field>
          <Field label="Mobile number" error={form.formState.errors.phone?.message}>
            <input
              {...form.register("phone")}
              placeholder="+965 9000 0000"
              inputMode="tel"
              autoComplete="tel"
              className={inputClass}
            />
          </Field>
          <Field label="Email (optional)" error={form.formState.errors.email?.message}>
            <input
              {...form.register("email")}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className={inputClass}
            />
          </Field>
          <Field label="Anything we should know? (optional)" error={form.formState.errors.notes?.message}>
            <textarea
              {...form.register("notes")}
              rows={3}
              placeholder="Allergies, preferences…"
              className={cn(inputClass, "h-auto py-3")}
            />
          </Field>
          <PrimaryButton type="submit">Continue</PrimaryButton>
        </form>
      )}

      {/* Confirm ---------------------------------------------------------- */}
      {step === "confirm" && service && date && time && (
        <div>
          <div className="space-y-4 rounded-3xl border border-blush-100 bg-white p-5 shadow-[0_2px_14px_-8px_rgba(138,68,55,0.35)]">
            <SummaryRow icon={Sparkles} label="Treatment" value={service.name} />
            <SummaryRow icon={User} label="With" value={staffName || "Any available"} />
            <SummaryRow
              icon={CalendarDays}
              label="When"
              value={`${formatDateKeyLong(date)} at ${formatTimeLabel(time)}`}
            />
            <SummaryRow icon={Clock} label="Duration" value={`${service.duration_minutes} minutes`} />
            <SummaryRow icon={Phone} label="Contact" value={form.getValues("phone")} />
            <div className="flex items-center justify-between border-t border-blush-100 pt-4">
              <span className="text-sm text-blush-700">Total</span>
              <span className="font-display text-xl text-blush-900">
                {formatCurrency(service.price)}
              </span>
            </div>
          </div>

          {submitError && (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</p>
          )}

          <PrimaryButton
            className="mt-5"
            loading={submitting}
            onClick={() => submitBooking(form.getValues())}
          >
            Confirm booking
          </PrimaryButton>
          <p className="mt-3 text-center text-xs text-blush-700/70">
            No payment needed now — you&apos;ll settle at the salon.
          </p>
        </div>
      )}

      {/* Done ------------------------------------------------------------- */}
      {step === "done" && confirmation && (
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-blush-100">
            <Check className="h-9 w-9 text-blush-600" />
          </div>
          <h2 className="font-display text-2xl text-blush-900">See you soon</h2>
          <p className="mt-1 text-sm text-blush-700/80">
            Your appointment is in the salon&apos;s diary.
          </p>

          <p className="mt-5 rounded-full border border-blush-200 bg-white px-5 py-2 font-mono text-sm font-semibold tracking-wider text-blush-800">
            {confirmation.reference}
          </p>

          <div className="mt-7 w-full space-y-4 rounded-3xl border border-blush-100 bg-white p-5 text-left">
            <SummaryRow icon={Sparkles} label="Treatment" value={confirmation.service.name} />
            <SummaryRow icon={User} label="With" value={confirmation.staffName} />
            <SummaryRow
              icon={CalendarDays}
              label="When"
              value={`${formatDateKeyLong(confirmation.date)} at ${formatTimeLabel(confirmation.time)}`}
            />
            {branch?.address && <SummaryRow icon={MapPin} label="Where" value={branch.address} />}
            <div className="flex items-center justify-between border-t border-blush-100 pt-4">
              <span className="text-sm text-blush-700">Total</span>
              <span className="font-display text-xl text-blush-900">
                {formatCurrency(confirmation.service.price)}
              </span>
            </div>
          </div>

          {branch?.phone && (
            <a
              href={`tel:${branch.phone.replace(/\s/g, "")}`}
              className="mt-5 text-sm font-medium text-blush-700 underline underline-offset-4"
            >
              Need to change it? Call {branch.phone}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

const inputClass =
  "h-12 w-full rounded-2xl border border-blush-100 bg-white px-4 text-[15px] text-blush-900 placeholder:text-blush-300 focus:border-blush-400 focus:outline-none focus:ring-2 focus:ring-blush-200";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-blush-800">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

function PrimaryButton({
  children,
  onClick,
  type = "button",
  loading,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  loading?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-full bg-blush-600 py-3.5 text-sm font-medium tracking-wide text-white transition-all",
        "active:scale-[0.99] active:bg-blush-700 disabled:opacity-60",
        className
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

function Chip({
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
        "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-colors",
        active
          ? "border-blush-400 bg-blush-100 text-blush-800"
          : "border-blush-100 bg-white text-blush-600"
      )}
    >
      {children}
    </button>
  );
}

function SelectCard({
  title,
  subtitle,
  initials,
  onClick,
}: {
  title: string;
  subtitle?: string;
  initials: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-3xl border border-blush-100 bg-white p-4 text-left shadow-[0_2px_14px_-8px_rgba(138,68,55,0.35)] transition-all active:scale-[0.99] active:border-blush-300"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blush-50 font-display text-lg text-blush-700">
        {initials}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-lg text-blush-900">{title}</span>
        {subtitle && <span className="block text-xs text-blush-700/70">{subtitle}</span>}
      </span>
    </button>
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
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-blush-500" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-blush-500">{label}</p>
        <p className="text-[15px] text-blush-900">{value}</p>
      </div>
    </div>
  );
}

function CenteredMessage({
  title,
  description,
  loading,
}: {
  title: string;
  description?: string;
  loading?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
      {loading && <Loader2 className="h-6 w-6 animate-spin text-blush-500" />}
      <p className="font-display text-xl text-blush-900">{title}</p>
      {description && <p className="max-w-xs text-sm text-blush-700/70">{description}</p>}
    </div>
  );
}

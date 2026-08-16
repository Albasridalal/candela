# Salon Management App

A small-salon booking system: an admin area for the salon team (dashboard, calendar,
services, staff, customers, opening hours) and a public, no-login booking page for
customers.

Built with Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth).

---

## What's built

| Area | What it does |
| --- | --- |
| **Dashboard** | Today's appointments, next 7 days, total customers, active staff, expected takings, and one-tap buttons to add a booking / customer / service / staff member. |
| **Calendar** | Day (staff columns), week and month views · staff filter · drag a card to reschedule it (to another time **and** another staff member in day view) · tap an empty slot to book it · off-hours are shaded · a live "now" line. |
| **Appointments** | Customer (searchable, or created inline), phone, service, staff, date, start time, duration, price, booking status and notes. End time is always derived from the duration. Double-booking is blocked client-side **and** by a database constraint. |
| **Services** | Add / edit / delete (archives instead when history exists), category (create new categories inline), duration, price, active/inactive, and which staff can perform each service. |
| **Staff** | Profile, services provided, working days and hours per weekday, time off, active/inactive. |
| **Customers** | Name, phone, email, birthday, notes, booking history, visit/cancellation/no-show counts, and search by name or phone. |
| **Opening hours** | Per-weekday opening and closing times, with any day markable as closed (Settings). |
| **Public booking** | `/book` — mobile-first, no login. Service → staff → date → time → details → confirmation with a reference number. Only offers times that fit salon opening hours, staff working hours, time off, the service duration and existing bookings. Bookings land straight in the admin calendar, and the customer is matched by phone or created. |

Deliberately **not** built (the database schema keeps room for them, but there is no UI
and nothing links to them): POS, sales, inventory, expenses, payroll, accounting,
marketing and advanced reports.

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Point it at a Supabase project

Copy `.env.example` to `.env.local` and fill in the values from your Supabase project
(Dashboard → Project Settings → API):

```bash
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (used by the admin app; RLS protects the data) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Used exclusively by `src/app/api/public/**` so the public booking page can read availability and write a booking without a login. |
| `NEXT_PUBLIC_SALON_TIMEZONE` | IANA timezone the salon's clock runs on, e.g. `Asia/Kuwait`. Optional — defaults to `Asia/Kuwait`. |

### 3. Create the schema

With the Supabase CLI (recommended — this is how the app is developed and tested):

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push          # applies supabase/migrations/*.sql in order
```

Or, without the CLI: open the Supabase SQL editor and run every file in
`supabase/migrations/` in filename order.

Optional demo data (a salon, four staff, a service menu, customers and a few days of
appointments):

```bash
psql "<your connection string>" -f supabase/seed.sql
```

### 4. Run it

```bash
npm run dev
```

- Admin: <http://localhost:3000> → redirects to `/login`
- Public booking page: <http://localhost:3000/book>

Create your login on `/login` → **Sign up**. The first signup automatically creates the
salon and its opening hours and makes you the owner; anyone who signs up afterwards joins
the same salon (see `supabase/migrations/0010_auth_bootstrap.sql`). There is no manual SQL
step. If you'd rather only you and one other admin can sign in, turn off signups in
Supabase → Authentication → Providers once you've both registered.

### Local Supabase instead of a hosted project

```bash
npx supabase start            # runs Postgres + Auth + PostgREST in Docker
```

It prints an API URL and keys — put those in `.env.local`. `supabase start` applies the
migrations and `supabase/seed.sql` automatically; `npx supabase db reset` re-applies them
from scratch.

---

## Testing the whole flow

With the app running and a login created:

1. **Create a service** — Services → *Add* → name, category (pick `+ New category…` to
   create one), duration, price → *Add service*.
2. **Create a staff member** — Staff → *Add* → name, tick the service under *Services this
   person provides*, set working days and hours → *Add staff member*.
3. **Set opening hours** — Settings → set each day's hours, untick a day to mark it closed
   → *Save settings*.
4. **Create a customer** — Customers → *Add* → name and phone → *Add customer*. Search for
   them by phone to confirm.
5. **Book an appointment** — Calendar → tap an empty slot in that staff member's column (or
   press *New*) → pick the customer, service, time → *Book appointment*. It appears on the
   grid immediately, positioned by time with the price and status shown.
6. **Check double-booking** — try booking the same staff member over that slot; it's
   refused with an explanation.
7. **Reschedule** — drag the card to another time or another staff column; it saves and
   confirms with a toast.
8. **Book as a customer** — open `/book` (a phone works best) → service → staff → date →
   time → name and phone → *Confirm booking*. You get a reference number.
9. **Confirm it synced** — back in the admin calendar, the online booking is on the grid
   with a small globe icon, and the customer now exists under Customers.

---

## Checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run build       # production build
```

---

## How it's put together

```
src/
  app/
    (app)/            Admin area (auth required): dashboard, calendar, customers,
                      services, staff, settings
    api/public/       Server routes the public booking page calls (service role only):
                      bootstrap, availability, book
    book/             Public booking page
    login/            Sign in / sign up
  components/
    calendar/         CalendarView (state + data) · TimeGrid (day/week grid, drag
                      and drop) · MonthGrid · AppointmentFormModal
    booking/          BookingWizard — the whole public flow
    customers/ services/ staff/ settings/ nav/ ui/
  lib/
    booking/          Availability engine (opening hours ∩ working hours ∩ time off
                      ∩ existing bookings)
    supabase/         Browser, server and service-role clients + shared queries
    utils/timezone.ts Salon wall-clock ↔ instant conversions
    validations/      Zod schemas shared by forms
supabase/
  migrations/         Schema, RLS, views, booking support, guards, grants, auth bootstrap
  seed.sql            Demo data
```

A few decisions worth knowing:

- **One salon, one clock.** Appointments are stored as `timestamptz`, but opening hours,
  working hours and the calendar grid are wall-clock. Everything converts through
  `src/lib/utils/timezone.ts`, so the app behaves identically on a server in UTC and a
  phone in another timezone.
- **Double-booking is a database guarantee.** `supabase/migrations/0008_overlap_guard.sql`
  adds an exclusion constraint: one staff member cannot hold two overlapping,
  non-cancelled appointments, no matter which client writes them.
- **The public page never touches the database directly.** It calls three server routes,
  which are the only place the service-role key is used, and availability is re-checked
  server-side immediately before a booking is written.
- **Multi-branch stays in the schema, out of the UI.** Every table carries `business_id`
  and appointments carry `branch_id`, so a second location is a UI change rather than a
  migration. Today the app always uses the salon's primary branch.

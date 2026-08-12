# Demo Salon — Salon Management App

Mobile-first salon management system built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Current scope (V1 priority release)

This build focuses on one complete, working end-to-end loop, per project priority:

**Owner adds services → Owner adds staff + working hours → Customer opens `/book` (no login) → picks
service/staff/date/time → booking is created → customer is matched/created by phone → booking appears
instantly in the salon calendar.**

Built and working:

- **Services** — categories, name, description, duration, price (KWD, 3 decimals), which staff can
  perform each service, active/inactive, add/edit/delete (soft-archives if referenced by history),
  search and filter by category/status.
- **Customers** — full database (name, mobile, email, birthday, notes), first/last visit, total
  visits, cancelled/no-show counts, preferred service & staff (derived automatically from history),
  appointment + purchase history, search by name or mobile, add/edit.
- **Online booking (`/book`)** — public, no login required. Category → service → staff (or "Any
  available staff") → date → real-time available times → contact details → confirmation with a
  unique reference number. Matches existing customers by mobile number instead of duplicating them.
- **Calendar** — day view with staff columns and time-positioned appointment cards, week view,
  manual add/edit, cancel, full status lifecycle, double-booking prevention (both client-side and a
  hard database constraint).
- **Staff** — profile, services performed, working hours per weekday, breaks/time off (blocks
  booking availability), active/inactive. This is what powers the availability engine above.
- **Branches** — locations, contact info, active/archive, and a per-weekday opening-hours editor.
  Opening hours directly bound what times the availability engine can ever offer online, so this
  was pulled forward from "deferred" — without it, hours could only be set via Supabase Studio.

Everything else (POS, Sales, Expenses, Inventory, Reports, Journal, Todo, Inbox, Marketing,
Settings) is intentionally deferred — the dashboard links to a "Coming soon" screen for each so
nothing 404s, but no functionality lives there yet. The database schema for all of it already
exists (see `supabase/migrations/0001_schema.sql`) so those modules can be built on top without
another schema migration.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Storage) · React Hook
Form + Zod · Lucide icons.

## ⚠️ Important — this was built without a network connection

The code in this repository was hand-written by an AI assistant working in a sandboxed environment
**with no internet access**, so it was never able to run `npm install`, `next build`, `next lint`,
or `tsc`. Everything here is believed correct based on careful reading of each library's API, but
**you must run the verification steps below yourself** before treating this as production-ready.
Expect to fix a small number of type or import issues on the first build — that's normal for code
that has never been compiled.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a project, then grab three values from
**Project Settings → API**:

- Project URL
- `anon` `public` key
- `service_role` key (keep this one secret — server-only)

Copy `.env.example` to `.env.local` and fill them in:

```bash
cp .env.example .env.local
```

### 3. Run database migrations

In the Supabase Dashboard, open **SQL Editor** and run each file in `supabase/migrations/` **in
order** (`0001` through `0008`). Alternatively, with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref your-project-ref
supabase db push
```

### 4. Load seed data

Run `supabase/seed.sql` in the SQL Editor. This creates:

- Business: **Demo Salon**
- Branch: **Main Branch**
- Staff: Sarah, Maria, Anna, Jenny (with working hours)
- Services across Nails, Hair, Massage, Brows & Lashes, Moroccan Bath categories
- 6 sample customers and a realistic spread of appointments (today, tomorrow, and a no-show)

### 5. Link your login to Demo Salon

Sign up through the app's `/login` screen (this creates a Supabase Auth user, but **not** yet a
`profiles` row, so the app will show "Account not linked yet"). Then, in Supabase SQL Editor, run
the snippet at the very bottom of `supabase/seed.sql` — it links your new login to the Demo Salon
business as `owner`. Refresh the app.

### 6. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000` for the staff app, and `http://localhost:3000/book` for the public
booking flow (open this one in an incognito window — it deliberately requires no login).

### 7. Verify it compiles and lints

Since this couldn't be checked during generation, please run:

```bash
npm run typecheck
npm run lint
npm run build
```

Fix anything that surfaces — most likely candidates are minor Supabase query typing issues (the
generated row types are hand-written to match `supabase/migrations/0001_schema.sql`; if you've
changed the schema, regenerate with `npx supabase gen types typescript`).

## Deployment

Any Next.js host works (Vercel is the path of least resistance):

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add the three environment variables from `.env.local` in Vercel's Project Settings →
   Environment Variables.
4. Deploy. Point your Supabase project's **Auth → URL Configuration** at your production domain.

## Architecture notes & assumptions

- **Multi-business ready, single-salon today.** Every business-owned table carries `business_id`,
  and Row Level Security (`0002_rls.sql`) enforces that a signed-in user only ever sees their own
  business's rows via `auth_business_id()`. The public booking page currently books into whichever
  business row is created first (`/api/public/bootstrap`) — correct for a single salon; swap for a
  slug-based lookup (`/book/[businessSlug]`) if you add more businesses later.
- **Public booking never uses the browser's Supabase key.** `/api/public/*` route handlers run
  server-side with the Supabase **service role** key (`src/lib/supabase/serviceRole.ts`, guarded
  with `server-only`), so anonymous customers can check availability and create a booking without
  any public RLS policies on `appointments`/`customers`. This keeps that data otherwise fully
  private.
- **Double-booking prevention is two-layered:** an application-level overlap check before every
  write, plus a Postgres `EXCLUDE` constraint (`0008_overlap_guard.sql`) using `btree_gist`, so even
  two simultaneous booking requests can't create overlapping appointments for the same staff member.
- **Availability engine** (`src/lib/booking/availability.ts`) intersects: branch opening hours →
  staff working hours for that weekday → staff time off → existing appointments (any non-cancelled
  status) → the selected service's duration. Slots are generated in 15-minute increments; same-day
  bookings require at least 30 minutes' lead time.
- **Customer de-duplication by phone**: `customers` has a unique index on `(business_id, phone)`.
  The booking API looks up by phone first and reuses that customer if found, only creating a new row
  otherwise — exactly the "connect, don't duplicate" behavior requested.
- **Appointment → service is 1:1 in the UI** (the appointment form and booking flow both ask for a
  single service), but the data model (`appointment_services`) supports many-to-one, so
  multi-service bookings are a UI-only change later, not a schema change.
- **Currency** is always rendered `KD 15.000` (3 decimals) via `src/lib/utils/currency.ts`.

## Project structure

```
src/
  app/
    (app)/            # authenticated staff app — bottom nav + all internal pages
    api/public/        # unauthenticated route handlers powering /book
    book/              # public booking wizard page
    login/
  components/
    booking/           # public booking wizard UI
    calendar/           # day/week grid, appointment card, appointment form
    customers/, staff/, services/   # module-specific UI
    dashboard/, nav/    # dashboard menu, bottom nav, quick add
    shared/              # BranchProvider, ComingSoon, NoProfileNotice
    ui/                  # design system primitives (Button, Card, Modal, Toast, ...)
  lib/
    booking/            # server-only availability engine
    supabase/           # browser/server/service-role clients + middleware
    types/               # hand-written types mirroring the schema
    utils/                # currency, date, status, cn helpers
    validations/          # Zod schemas
supabase/
  migrations/            # run in numeric order
  seed.sql
```

## Roles

`owner`, `manager`, `receptionist`, `staff` exist as a Postgres enum and on every `profiles` row.
RLS currently gates by **business**, not yet by **role** — every signed-in team member can read/write
their business's data. Role-based UI/permission restrictions are architected for (the enum, the
column) but not yet enforced; add role checks in RLS policies and in the UI as the next layer.

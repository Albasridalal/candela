# Agency Request Portal

A single source of truth for the design requests KFH Marketing sends to its external agency.
Requests used to travel by email, where the gap between "what we asked for" and "what was
delivered" got lost. The account manager logs every request here, assigns it to a designer, and
tracks it to delivery.

Interface language: English.

---

## Run it

```bash
cd agency-request-portal
npm install
npm run dev          # http://localhost:3000
```

That is the whole setup. With no configuration the portal starts in **demo mode**: twelve
realistic sample requests, four designers and a working mix of overdue, due-soon and delivered
work, all held in the server's memory. Every screen is fully usable — create, edit, comment,
attach, change status. Data resets when the server restarts.

When you are ready to make it permanent and shared, connect Supabase (below). No code changes.

---

## Screens

| Screen | Path | What it does |
| --- | --- | --- |
| **Dashboard** | `/dashboard` | Open / in-progress / overdue / delivered-this-week cards, pending + overdue per designer, and a "needs attention" list. |
| **Requests** | `/requests` | Every request, filterable and sortable. Overdue rows red, due-soon amber. |
| **Request detail** | `/requests/[id]` | All fields, one-click status control, comment thread, attachments in and out. |
| **New request** | `/requests/new` | Log a new request. |
| **Settings** | `/settings` | The editable designer and work-type lists. |

An **alerts badge** sits in the header on every screen, listing everything overdue or due within
two days.

### Filters and sorting

Filters live in the URL, so a filtered view can be bookmarked or pasted into an email —
`/requests?designer=<id>&flag=overdue` is a designer's chase list. You can filter by status, work
type, priority, designer and deadline flag, search across title/brief/reference/designer, and sort
by deadline, priority, days pending or submission date.

Open work always sorts above delivered work whatever the sort key. This is a chase list: a
request delivered last week should never head the table just because its deadline is the oldest
date on the page.

---

## The data model

A `requests` row holds title, brief, work type, priority, date submitted, deadline, assigned
designer and status, plus a human-readable reference (`REQ-0001`) used when quoting a request in
email. Comments and attachments hang off it. Work types and designers are their own editable
tables.

| Field | Notes |
| --- | --- |
| Work type | `Image` · `Breakdown` · `Animation` — editable in Settings |
| Priority | `High` · `Medium` · `Low` |
| Status | `New` → `In Progress` → `Delivered` |
| Date submitted | Defaults to today, editable — you can log a request that was sent last week |
| Attachments | `reference` (files in) and `deliverable` (finals out) |

### Derived values

Nothing derived is stored. Days pending, overdue and due-soon are all computed in
`src/lib/logic.ts`, so the demo and Supabase backends can never disagree:

- **Days pending** — `today − date_submitted`, counted only while the request is open. Delivered
  requests show their turnaround (`delivered_at − date_submitted`) instead.
- **Overdue** — deadline passed **and** status ≠ Delivered. Red row, red flag, counted in alerts.
- **Due soon** — deadline within 2 days (`DUE_SOON_DAYS`). Amber row, amber flag, in alerts.
- **Delivered this week** — delivered within the last 7 days.

`delivered_at` is the one exception, and it is never written by the application: a database
trigger stamps it when a request becomes Delivered and clears it if the request is moved back to
an open status. The demo backend mirrors that same rule. Moving a request back out of Delivered
therefore restarts its days-pending count, which is the honest reading — it is open work again.

---

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL in `supabase/` **in order** — via the SQL Editor, or `supabase db push`:

   | File | What it creates |
   | --- | --- |
   | `migrations/0001_schema.sql` | Tables, enums, indexes, the `updated_at` and `delivered_at` triggers |
   | `migrations/0002_rls.sql` | Row level security — signed-in users only |
   | `migrations/0003_storage.sql` | The private `request-attachments` bucket and its policies |
   | `seed.sql` | The same sample requests as demo mode (optional, safe to re-run) |

3. Copy `.env.example` to `.env.local` and fill in both values from
   **Project Settings → API**:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```

4. Add your account managers under **Authentication → Users**. Sign-up is deliberately not exposed
   in the UI — this is an internal tool, so accounts are created by whoever administers the
   project.
5. Restart the dev server. The demo banner disappears, `/login` starts asking for credentials, and
   every screen is now reading and writing Postgres.

Attachments upload to a **private** bucket; the app hands out signed URLs valid for one hour
rather than public links.

### Access model

Every signed-in user is an account manager and can see and edit all requests — that is what the
RLS policies in `0002_rls.sql` say. The read-only agency status link described as a phase 2 idea
is **not built**; adding it means a new policy for a dedicated role, not loosening these.

---

## Project layout

```
src/
  app/
    (app)/            Authenticated shell — sidebar, alerts badge, all four screens
    login/            Sign-in (demo mode shows a pass-through notice instead)
  components/
    dashboard/        Stat cards, per-designer workload table
    requests/         Table, filters, form, status control, comments, attachments
    settings/         Designer and work-type editors
    ui/               Badge, Button, Card, Field primitives
  lib/
    logic.ts          Days pending, overdue, due soon — the single source of truth
    query.ts          Filtering and sorting
    stats.ts          Dashboard aggregates
    actions.ts        Server actions (all mutations, Zod-validated)
    data/             repo.ts (interface) + supabase.ts + demo.ts
supabase/             Migrations and seed
```

Data access goes through the `PortalRepo` interface in `src/lib/data/repo.ts`. `getRepo()` returns
the Supabase implementation when credentials are present and the in-memory one otherwise, which is
why every screen is written once and works against either.

Filtering and sorting run in the application rather than in SQL. At a marketing team's request
volume that is not worth pushing into the database, and it keeps both backends behaving
identically.

---

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm start          # serve the build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

---

## Known gaps

- **Demo-mode uploads are capped at 1 MB** and held as data URLs in memory. Connect Supabase for
  real file storage.
- **No read-only agency link yet** — see the access model above.
- **`npm audit` reports three high-severity advisories** inherited from Next.js 15's own
  dependencies (`postcss`, and the optional `sharp`). They have no patched release on the 15.x
  line; clearing them requires upgrading to Next 16. Neither is reachable from this app's runtime
  paths — `sharp` is only used by `next/image`, which this app does not use.

import { AddDesignerForm, AddWorkTypeForm } from "@/components/settings/AddForms";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { toggleDesignerAction, toggleWorkTypeAction } from "@/lib/actions";
import { getRepo, isDemoMode } from "@/lib/data";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

function ToggleRow({
  name,
  meta,
  isActive,
  action,
  id,
}: {
  name: string;
  meta?: string | null;
  isActive: boolean;
  action: (formData: FormData) => Promise<void>;
  id: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <p className={cn("truncate text-sm font-medium", isActive ? "text-slate-900" : "text-slate-400")}>
          {name}
        </p>
        {meta ? <p className="truncate text-xs text-slate-500">{meta}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
          )}
        >
          {isActive ? "Active" : "Archived"}
        </span>
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="is_active" value={String(isActive)} />
          <button
            type="submit"
            className="text-xs font-medium text-slate-500 transition hover:text-slate-900"
          >
            {isActive ? "Archive" : "Restore"}
          </button>
        </form>
      </div>
    </li>
  );
}

export default async function SettingsPage() {
  const repo = getRepo();
  const [designers, workTypes] = await Promise.all([repo.listDesigners(), repo.listWorkTypes()]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          The lists behind the request form. Archived entries stay attached to past requests but
          stop appearing in the dropdowns.
        </p>
      </header>

      <Card>
        <CardHeader
          title="Agency designers"
          description="Who the work can be assigned to."
          action={
            <span className="text-xs text-slate-500">
              {designers.filter((d) => d.is_active).length} active
            </span>
          }
        />
        <ul className="divide-y divide-slate-100">
          {designers.map((designer) => (
            <ToggleRow
              key={designer.id}
              id={designer.id}
              name={designer.name}
              meta={designer.email}
              isActive={designer.is_active}
              action={toggleDesignerAction}
            />
          ))}
          {designers.length === 0 ? (
            <li className="px-5 py-6 text-sm text-slate-500">No designers yet.</li>
          ) : null}
        </ul>
        <CardBody className="border-t border-slate-200 bg-slate-50">
          <AddDesignerForm count={designers.length} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Work types"
          description="Image, Breakdown and Animation to start with — add your own."
          action={
            <span className="text-xs text-slate-500">
              {workTypes.filter((w) => w.is_active).length} active
            </span>
          }
        />
        <ul className="divide-y divide-slate-100">
          {workTypes.map((workType) => (
            <ToggleRow
              key={workType.id}
              id={workType.id}
              name={workType.name}
              isActive={workType.is_active}
              action={toggleWorkTypeAction}
            />
          ))}
          {workTypes.length === 0 ? (
            <li className="px-5 py-6 text-sm text-slate-500">No work types yet.</li>
          ) : null}
        </ul>
        <CardBody className="border-t border-slate-200 bg-slate-50">
          <AddWorkTypeForm count={workTypes.length} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Data source" />
        <CardBody className="text-sm text-slate-600">
          {isDemoMode ? (
            <p>
              The portal is running in <span className="font-medium text-slate-900">demo mode</span>
              . Sample data is held in the server&apos;s memory and resets when it restarts. Add{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{" "}
              and{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>{" "}
              to <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.env.local</code>, run
              the migrations in <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">supabase/</code>, and
              the same screens switch to the shared database with login and file storage.
            </p>
          ) : (
            <p>
              Connected to <span className="font-medium text-slate-900">Supabase</span>. Requests,
              comments and attachments are stored permanently and shared across everyone who signs
              in.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { AttachmentPanel } from "@/components/requests/AttachmentPanel";
import { CommentThread } from "@/components/requests/CommentThread";
import { StatusControl } from "@/components/requests/StatusControl";
import { FlagBadge, PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { deleteRequestAction } from "@/lib/actions";
import { getRepo } from "@/lib/data";
import {
  daysPending,
  describeDeadline,
  flagOf,
  formatDate,
  formatDateTime,
  todayISO,
  turnaroundDays,
} from "@/lib/logic";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await getRepo().getRequest(id);
  return { title: request ? request.title : "Request" };
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = getRepo();
  const request = await repo.getRequest(id);
  if (!request) notFound();

  const today = todayISO();
  const flag = flagOf(request, today);
  const pending = daysPending(request, today);
  const turnaround = turnaroundDays(request);
  const attachments = await repo.resolveAttachmentUrls(request.attachments);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/requests" className="text-sm text-slate-500 hover:text-slate-800">
          ← Back to requests
        </Link>
      </div>

      <header
        className={cn(
          "rounded-xl border bg-white px-5 py-4 shadow-card",
          flag === "overdue" ? "border-red-300" : "border-slate-200",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {request.reference}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{request.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
              {request.work_type ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {request.work_type.name}
                </span>
              ) : null}
              <FlagBadge flag={flag} label={describeDeadline(request, today)} />
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <StatusControl id={request.id} status={request.status} />
            <div className="flex items-center gap-3">
              <Link
                href={`/requests/${request.id}/edit`}
                className="text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                Edit
              </Link>
              <form action={deleteRequestAction}>
                <input type="hidden" name="id" value={request.id} />
                <button
                  type="submit"
                  className="text-sm font-medium text-slate-400 transition hover:text-red-600"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Brief" />
            <CardBody>
              {request.brief ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {request.brief}
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  No brief was recorded.{" "}
                  <Link
                    href={`/requests/${request.id}/edit`}
                    className="font-medium text-brand-700 hover:text-brand-800"
                  >
                    Add one
                  </Link>
                  .
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Attachments"
              description="Reference files sent to the agency, and the finals that came back."
            />
            <CardBody>
              <AttachmentPanel requestId={request.id} attachments={attachments} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Comments"
              description={`${request.comments.length} ${
                request.comments.length === 1 ? "comment" : "comments"
              }`}
            />
            <CardBody>
              <CommentThread requestId={request.id} comments={request.comments} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="py-2">
              <dl className="divide-y divide-slate-100">
                <DetailRow label="Assigned designer">
                  {request.designer?.name ?? <span className="text-slate-400">Unassigned</span>}
                </DetailRow>
                <DetailRow label="Work type">{request.work_type?.name ?? "—"}</DetailRow>
                <DetailRow label="Priority">{request.priority}</DetailRow>
                <DetailRow label="Date submitted">{formatDate(request.date_submitted)}</DetailRow>
                <DetailRow label="Deadline">
                  <span className={cn(flag === "overdue" && "text-red-700")}>
                    {formatDate(request.deadline)}
                  </span>
                </DetailRow>
                <DetailRow label="Days pending">
                  {pending === null ? (
                    <span className="text-slate-400">Delivered</span>
                  ) : (
                    <span className={cn(flag === "overdue" && "text-red-700")}>{pending} days</span>
                  )}
                </DetailRow>
                {request.status === "Delivered" ? (
                  <>
                    <DetailRow label="Delivered on">{formatDate(request.delivered_at)}</DetailRow>
                    <DetailRow label="Turnaround">
                      {turnaround === null ? "—" : `${turnaround} days`}
                    </DetailRow>
                  </>
                ) : null}
                <DetailRow label="Last updated">{formatDateTime(request.updated_at)}</DetailRow>
              </dl>
            </CardBody>
          </Card>

          {flag !== "ok" ? (
            <div
              className={cn(
                "rounded-xl border px-4 py-3 text-sm",
                flag === "overdue"
                  ? "border-red-300 bg-red-50 text-red-800"
                  : "border-amber-300 bg-amber-50 text-amber-900",
              )}
            >
              <p className="font-medium">
                {flag === "overdue" ? "This request is overdue." : "This request is due soon."}
              </p>
              <p className="mt-1">
                Deadline {formatDate(request.deadline)} — {describeDeadline(request, today)}.{" "}
                {request.designer
                  ? `Chase ${request.designer.name}.`
                  : "No designer is assigned yet."}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

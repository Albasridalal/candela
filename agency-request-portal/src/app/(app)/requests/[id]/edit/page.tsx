import Link from "next/link";
import { notFound } from "next/navigation";
import { RequestForm } from "@/components/requests/RequestForm";
import { Card, CardBody } from "@/components/ui/Card";
import { getRepo } from "@/lib/data";
import { todayISO } from "@/lib/logic";

export const metadata = { title: "Edit request" };
export const dynamic = "force-dynamic";

export default async function EditRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = getRepo();
  const [request, designers, workTypes] = await Promise.all([
    repo.getRequest(id),
    repo.listDesigners(),
    repo.listWorkTypes(),
  ]);
  if (!request) notFound();

  // Keep an archived designer or work type selectable while editing an older
  // request, otherwise saving would silently clear the assignment.
  const visibleDesigners = designers.filter(
    (designer) => designer.is_active || designer.id === request.designer?.id,
  );
  const visibleWorkTypes = workTypes.filter(
    (workType) => workType.is_active || workType.id === request.work_type?.id,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <Link href={`/requests/${request.id}`} className="text-sm text-slate-500 hover:text-slate-800">
          ← Back to request
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Edit request</h1>
        <p className="mt-1 text-sm text-slate-500">{request.reference}</p>
      </header>

      <Card>
        <CardBody className="p-6">
          <RequestForm
            mode="edit"
            defaults={{
              id: request.id,
              title: request.title,
              brief: request.brief,
              work_type_id: request.work_type?.id ?? null,
              priority: request.priority,
              date_submitted: request.date_submitted,
              deadline: request.deadline,
              designer_id: request.designer?.id ?? null,
              status: request.status,
            }}
            designers={visibleDesigners}
            workTypes={visibleWorkTypes}
            today={todayISO()}
          />
        </CardBody>
      </Card>
    </div>
  );
}

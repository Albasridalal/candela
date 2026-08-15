import Link from "next/link";
import { RequestForm } from "@/components/requests/RequestForm";
import { Card, CardBody } from "@/components/ui/Card";
import { getRepo } from "@/lib/data";
import { todayISO } from "@/lib/logic";

export const metadata = { title: "New request" };
export const dynamic = "force-dynamic";

export default async function NewRequestPage() {
  const repo = getRepo();
  const [designers, workTypes] = await Promise.all([repo.listDesigners(), repo.listWorkTypes()]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <Link href="/requests" className="text-sm text-slate-500 hover:text-slate-800">
          ← Back to requests
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">New request</h1>
        <p className="mt-1 text-sm text-slate-500">
          Log what the agency has been asked to produce. You can attach reference files once the
          request is created.
        </p>
      </header>

      <Card>
        <CardBody className="p-6">
          <RequestForm
            mode="create"
            defaults={{ date_submitted: todayISO(), priority: "Medium", status: "New" }}
            designers={designers.filter((designer) => designer.is_active)}
            workTypes={workTypes.filter((workType) => workType.is_active)}
            today={todayISO()}
          />
        </CardBody>
      </Card>
    </div>
  );
}

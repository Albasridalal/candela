import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Feedback";
import { CustomerForm } from "@/components/customers/CustomerForm";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).single();
  if (!customer) notFound();

  return (
    <div>
      <PageHeader title="Edit Customer" />
      <CustomerForm customer={customer} />
    </div>
  );
}

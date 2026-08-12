import Link from "next/link";
import { UserPlus, Contact } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { CustomerListClient } from "@/components/customers/CustomerListClient";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .order("full_name");

  return (
    <div>
      <PageHeader
        title="Customers"
        description={`${customers?.length ?? 0} customers`}
        action={
          <Link href="/customers/new">
            <Button size="sm">
              <UserPlus className="h-4 w-4" /> Add
            </Button>
          </Link>
        }
      />

      {!customers || customers.length === 0 ? (
        <EmptyState
          icon={Contact}
          title="No customers yet"
          description="Add your first customer to start booking appointments."
          action={
            <Link href="/customers/new">
              <Button size="sm">Add customer</Button>
            </Link>
          }
        />
      ) : (
        <CustomerListClient initialCustomers={customers} />
      )}
    </div>
  );
}

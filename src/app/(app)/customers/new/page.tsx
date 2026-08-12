import { PageHeader } from "@/components/ui/Feedback";
import { CustomerForm } from "@/components/customers/CustomerForm";

export default function NewCustomerPage() {
  return (
    <div>
      <PageHeader title="Add Customer" />
      <CustomerForm />
    </div>
  );
}

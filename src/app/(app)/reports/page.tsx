import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/shared/ComingSoon";
export default function ReportsPage() {
  return (
    <ComingSoon
      title="Reports"
      icon={BarChart3}
      description="Full reporting arrives after POS and Expenses are built. For now, see each Customer profile for visit and spend stats."
    />
  );
}

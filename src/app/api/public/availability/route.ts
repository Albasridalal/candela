import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { getAnyStaffAvailableSlots, getStaffAvailableSlots } from "@/lib/booking/availability";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId");
  const serviceId = searchParams.get("serviceId");
  const staffId = searchParams.get("staffId"); // "any" or a specific staff id
  const date = searchParams.get("date");

  if (!branchId || !serviceId || !staffId || !date) {
    return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: service } = await supabase
    .from("services")
    .select("duration_minutes, is_active")
    .eq("id", serviceId)
    .single();

  if (!service || !service.is_active) {
    return NextResponse.json({ error: "Service not found." }, { status: 404 });
  }

  if (staffId === "any") {
    const { data: eligible } = await supabase
      .from("staff_services")
      .select("staff_id")
      .eq("service_id", serviceId);
    const eligibleStaffIds = (eligible ?? []).map((e) => e.staff_id);

    const slots = await getAnyStaffAvailableSlots({
      branchId,
      eligibleStaffIds,
      serviceDurationMinutes: service.duration_minutes,
      date,
    });
    return NextResponse.json({ slots });
  }

  const times = await getStaffAvailableSlots({
    branchId,
    staffId,
    serviceDurationMinutes: service.duration_minutes,
    date,
  });

  return NextResponse.json({ slots: times.map((time) => ({ time, staffId })) });
}

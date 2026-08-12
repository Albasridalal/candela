import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { publicBookingCustomerSchema } from "@/lib/validations/schemas";
import { getStaffAvailableSlots } from "@/lib/booking/availability";

interface BookBody {
  branchId: string;
  serviceId: string;
  staffId: string; // resolved specific staff id (never "any" by this point)
  date: string;
  time: string;
  customer: {
    full_name: string;
    phone: string;
    email?: string;
    notes?: string;
  };
}

function randomReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `SL-${code}`;
}

export async function POST(request: NextRequest) {
  let body: BookBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { branchId, serviceId, staffId, date, time } = body;
  if (!branchId || !serviceId || !staffId || !date || !time) {
    return NextResponse.json({ error: "Missing required booking details." }, { status: 400 });
  }

  const parsedCustomer = publicBookingCustomerSchema.safeParse(body.customer);
  if (!parsedCustomer.success) {
    return NextResponse.json(
      { error: parsedCustomer.error.issues[0]?.message ?? "Invalid customer details." },
      { status: 400 }
    );
  }
  const customerInput = parsedCustomer.data;

  const supabase = createServiceRoleClient();

  const { data: branch } = await supabase.from("branches").select("business_id").eq("id", branchId).single();
  const { data: service } = await supabase
    .from("services")
    .select("id, name, price, duration_minutes, is_active")
    .eq("id", serviceId)
    .single();
  const { data: staffRow } = await supabase.from("staff").select("id, full_name").eq("id", staffId).single();

  if (!branch || !service || !service.is_active || !staffRow) {
    return NextResponse.json({ error: "This service or staff member is no longer available." }, { status: 404 });
  }

  // Re-validate availability server-side right before writing, to close the
  // race window between the customer loading slots and confirming one.
  const freshSlots = await getStaffAvailableSlots({
    branchId,
    staffId,
    serviceDurationMinutes: service.duration_minutes,
    date,
  });
  if (!freshSlots.includes(time)) {
    return NextResponse.json(
      { error: "That time was just booked by someone else. Please choose another slot." },
      { status: 409 }
    );
  }

  const startTime = new Date(`${date}T${time}:00`).toISOString();
  const endTime = new Date(
    new Date(startTime).getTime() + service.duration_minutes * 60000
  ).toISOString();

  // Match an existing customer by phone within this business, or create one.
  const normalizedPhone = customerInput.phone.trim();
  let customerId: string;
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("business_id", branch.business_id)
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (existingCustomer) {
    customerId = existingCustomer.id;
    // Fill in blanks (e.g. email) without overwriting existing data.
    await supabase
      .from("customers")
      .update({
        email: customerInput.email || undefined,
        full_name: customerInput.full_name || undefined,
      })
      .eq("id", customerId)
      .is("email", null);
  } else {
    const { data: created, error: createError } = await supabase
      .from("customers")
      .insert({
        business_id: branch.business_id,
        full_name: customerInput.full_name,
        phone: normalizedPhone,
        email: customerInput.email || null,
      })
      .select("id")
      .single();
    if (createError || !created) {
      return NextResponse.json({ error: "Couldn't save your details. Please try again." }, { status: 500 });
    }
    customerId = created.id;
  }

  let reference = randomReference();
  let appointmentId: string | null = null;
  for (let attempt = 0; attempt < 3 && !appointmentId; attempt++) {
    const { data: inserted, error } = await supabase
      .from("appointments")
      .insert({
        business_id: branch.business_id,
        branch_id: branchId,
        customer_id: customerId,
        staff_id: staffId,
        start_time: startTime,
        end_time: endTime,
        status: "pending",
        source: "online",
        notes: customerInput.notes || null,
        booking_reference: reference,
      })
      .select("id")
      .single();

    if (!error && inserted) {
      appointmentId = inserted.id;
    } else if (error?.code === "23505") {
      reference = randomReference(); // reference collision, retry
    } else if (error?.code === "23P01") {
      // Database-level overlap guard caught a race: someone else booked
      // this exact slot between our availability check and this insert.
      return NextResponse.json(
        { error: "That time was just booked by someone else. Please choose another slot." },
        { status: 409 }
      );
    } else {
      return NextResponse.json({ error: "Couldn't create the booking. Please try again." }, { status: 500 });
    }
  }

  if (!appointmentId) {
    return NextResponse.json({ error: "Couldn't create the booking. Please try again." }, { status: 500 });
  }

  await supabase.from("appointment_services").insert({
    appointment_id: appointmentId,
    service_id: service.id,
    price: service.price,
    duration_minutes: service.duration_minutes,
  });

  return NextResponse.json({
    reference,
    service: { name: service.name, price: service.price, duration_minutes: service.duration_minutes },
    staffName: staffRow.full_name,
    date,
    time,
  });
}

import { BookingWizard } from "@/components/booking/BookingWizard";

export const metadata = {
  title: "Book an Appointment",
  description: "Book your salon appointment online in a few taps.",
};

export default function PublicBookingPage() {
  return (
    <div className="min-h-dvh bg-surface-subtle">
      <BookingWizard />
    </div>
  );
}

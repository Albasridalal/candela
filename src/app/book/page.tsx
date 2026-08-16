import { BookingWizard } from "@/components/booking/BookingWizard";

export const metadata = {
  title: "Book an appointment",
  description: "Book your salon appointment online in a few taps.",
};

export default function PublicBookingPage() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-champagne-50 via-blush-50 to-champagne-100">
      <BookingWizard />
    </div>
  );
}

import { getBusiness, getCurrentProfile } from "@/lib/supabase/queries";
import { BottomNav, SideNav } from "@/components/nav/AppNav";
import { NoProfileNotice } from "@/components/shared/NoProfileNotice";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  // Signed in, but not linked to a salon — normally impossible now that signup
  // provisions a profile (supabase/migrations/0010_auth_bootstrap.sql).
  if (!profile) return <NoProfileNotice />;

  const business = await getBusiness();

  return (
    <div className="flex min-h-dvh">
      <SideNav salonName={business?.name ?? "Salon"} />
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-10 lg:px-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}

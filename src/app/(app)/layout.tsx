import { getCurrentProfile, getBranches } from "@/lib/supabase/queries";
import { BranchProvider } from "@/components/shared/BranchProvider";
import { BottomNav } from "@/components/nav/BottomNav";
import { NoProfileNotice } from "@/components/shared/NoProfileNotice";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    // Authenticated in Supabase Auth, but no profile row linked to a
    // business yet. See supabase/seed.sql "LINK YOUR LOGIN" section.
    return <NoProfileNotice />;
  }

  const branches = await getBranches();

  return (
    <BranchProvider branches={branches}>
      <div className="mx-auto min-h-dvh max-w-6xl pb-24 sm:pb-8">
        <main className="px-4 pt-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      <BottomNav />
    </BranchProvider>
  );
}

import type { ReactNode } from "react";
import { Aurora } from "@/components/aurora";
import { Sidebar, MobileNav } from "@/components/sidebar";
import { PageTransition } from "@/components/page-transition";

export const dynamic = "force-dynamic";

function isDbSkipped() {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE === "phase-development-build" ||
    process.env.NEXT_SKIP_DB === "1" ||
    process.env.NEXT_SKIP_DB === "true"
  );
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!isDbSkipped()) {
    const { ensureSeedData } = await import("@/lib/seed");
    await ensureSeedData();
  }

  return (
    <div className="relative flex min-h-screen">
      <Aurora />
      <Sidebar />
      <main className="flex-1 px-5 pb-28 pt-6 sm:px-8 lg:pb-10">
        <div className="mx-auto max-w-6xl">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}

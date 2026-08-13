import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserNav } from "@/components/layout/UserNav";

/**
 * Protected route group layout.
 * Wraps user pages inside the Left Sidebar persistent shell.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Left Sidebar navigation */}
      <Sidebar user={user} />

      {/* Main Workspace container */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Top bar with user actions */}
        <header className="flex h-14 items-center justify-end border-b border-border-default bg-surface-card px-6 shrink-0 z-20">
          <UserNav user={user} />
        </header>

        {/* Scrollable workspace content */}
        <main className="flex-1 overflow-y-auto bg-background p-6 md:p-10 relative">
          <div className="mx-auto max-w-3xl w-full pb-16">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

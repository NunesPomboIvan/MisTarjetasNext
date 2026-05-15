import { BottomNav } from "@/components/shared/bottom-nav";
import { AuthGate } from "@/components/shared/auth-gate";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-lg px-4 py-4">{children}</div>
        </main>

        <BottomNav />
      </div>
    </AuthGate>
  );
}

import { BottomNav } from "@/components/shared/bottom-nav";

/**
 * Layout para rutas protegidas.
 * El guard de autenticación se hace en proxy.ts.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg px-4 py-4">{children}</div>
      </main>

      <BottomNav />
    </div>
  );
}

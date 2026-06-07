import { BottomNav } from "@/components/shared/bottom-nav";
import { AuthGate } from "@/components/shared/auth-gate";

// El cliente de Supabase usa un user_id fijo (sin cookies), así que Next no
// detecta APIs dinámicas y prerenderizaría estas páginas en build time. Eso
// congela los datos y, peor, calcula "días para vencer/cerrar" con la fecha
// del build. Forzamos render dinámico para que siempre use datos y fecha
// actuales en cada request.
export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex flex-1 flex-col pb-[calc(9.5rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6 pb-2">{children}</div>
        </main>

        <BottomNav />
      </div>
    </AuthGate>
  );
}

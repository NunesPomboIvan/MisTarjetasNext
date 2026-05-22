import { BottomNav } from "@/components/shared/bottom-nav";
import { AuthGate } from "@/components/shared/auth-gate";
import { TitularSwitcher } from "@/components/titulares/titular-switcher";
import { resolveTitulares } from "@/lib/titulares/server";

// El cliente de Supabase usa un user_id fijo (sin cookies), así que Next no
// detecta APIs dinámicas y prerenderizaría estas páginas en build time. Eso
// congela los datos y, peor, calcula "días para vencer/cerrar" con la fecha
// del build. Forzamos render dinámico para que siempre use datos y fecha
// actuales en cada request.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { titulares, activeId } = await resolveTitulares();

  return (
    <AuthGate>
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
          {titulares.length > 0 && (
            <div className="sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
              <div className="mx-auto flex max-w-lg items-center justify-end px-4 py-2">
                <TitularSwitcher titulares={titulares} activeId={activeId} />
              </div>
            </div>
          )}
          <div className="mx-auto max-w-lg px-4 py-4">{children}</div>
        </main>

        <BottomNav />
      </div>
    </AuthGate>
  );
}

import { cn } from "@/lib/utils";

interface StickyPageHeaderProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Header sticky para pantallas con scroll. Se pega al top del body
 * scrolleable y pinta un velo con degradé detrás (opaco arriba, transparente
 * abajo) para que el contenido scrolleando no se corte de forma brusca, sino
 * que se desvanezca al pasar por debajo. Compensa el `pt-6 px-4` del wrapper
 * de app/(app)/layout (y el safe-area-inset-top del body) con márgenes
 * negativos y aporta su propio padding: así, en reposo queda en el mismo
 * lugar, pero al scrollear cubre también la zona de la status bar/notch en
 * vez de dejar que el contenido se vea por detrás.
 */
export function StickyPageHeader({ children, className }: StickyPageHeaderProps) {
  return (
    <div
      className={cn("sticky top-0 z-20 -mx-4 px-4 pb-3", className)}
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)",
        marginTop: "calc(-1 * (env(safe-area-inset-top) + 1.5rem))",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -bottom-6 -z-10"
        style={{
          background:
            "linear-gradient(to bottom, var(--background) 0%, var(--background) 65%, transparent 100%)",
        }}
      />
      {children}
    </div>
  );
}

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
 * de app/(app)/layout con `-mt-6 -mx-4` y aporta su propio padding.
 */
export function StickyPageHeader({ children, className }: StickyPageHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-4 -mt-6 px-4 pt-6 pb-3",
        className
      )}
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

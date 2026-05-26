import { cn } from "@/lib/utils";

interface StickyPageHeaderProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Header sticky para pantallas con scroll. Se pega al top del body
 * scrolleable y pinta el background detrás para que el contenido no se vea
 * pasar borroso. Compensa el `pt-6 px-4` del wrapper de app/(app)/layout
 * con `-mt-6 -mx-4` y aporta su propio padding.
 */
export function StickyPageHeader({ children, className }: StickyPageHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-4 -mt-6 bg-background px-4 pt-6 pb-3",
        className
      )}
    >
      {children}
    </div>
  );
}

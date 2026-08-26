import { ArrowLeft } from "lucide-react";
import { GuardedLink } from "./guarded-link";

interface BackButtonProps {
  /**
   * Destino jerárquico ("subir" al padre). Se usa navegación explícita en vez
   * de router.back() para que el comportamiento sea determinista: nunca saca
   * al usuario de la app (deep-link / refresh) ni lo devuelve al formulario
   * después de un redirect de guardado. Default: inicio.
   */
  href?: string;
  label?: string;
}

export function BackButton({ href = "/", label = "Volver" }: BackButtonProps) {
  return (
    <GuardedLink
      href={href}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground active:scale-95"
    >
      <ArrowLeft className="h-5 w-5" />
    </GuardedLink>
  );
}

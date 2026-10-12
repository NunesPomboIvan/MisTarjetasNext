/**
 * Formato de los items de los formularios de alta (Consumo y Préstamo): el
 * mismo del botón "Marcar como devolución" (borde + fondo tenue, esquinas
 * cuadradas, letra en negrita), un poco más grande para completar cómodo.
 */

/** Card de un item: borde + fondo tenue. */
export const FIELD_CARD = "rounded-md border border-border bg-muted/50 dark:bg-muted/50";
/** Tipografía de los títulos chicos dentro/encima de una card. */
export const FIELD_LABEL = "text-[11px] font-semibold text-muted-foreground";
/** Envuelve un `<Input>` de otro componente para que tome el formato de card. */
export const FIELD_INPUT =
  "[&_input]:h-9 [&_input]:rounded-md [&_input:not(.border-destructive)]:border-border [&_input]:bg-muted/50 dark:[&_input]:bg-muted/50 [&_input]:px-3 [&_input]:py-2 [&_input]:text-[13px] [&_input]:font-semibold [&_span]:text-[13px] [&_span]:font-semibold";
/** Item de una sola línea (input propio, selector de fecha…). */
export const FIELD_ROW = `${FIELD_CARD} h-9 px-3 py-2 text-[13px] font-semibold md:text-[13px] [&_svg]:size-3.5`;
/** Botón del formulario, igual a "Marcar como devolución". */
export const FIELD_BUTTON =
  "inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-3 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground";

/** Opción de un grupo excluyente (distribución del descuento, modo de carga…). */
export function fieldOption(active: boolean): string {
  return [
    "rounded-md border px-3 py-2 text-left text-[13px] font-semibold transition-all",
    active
      ? "border-primary bg-primary/10 text-primary shadow-sm"
      : "border-border bg-muted/50 text-muted-foreground hover:border-primary/40 hover:text-foreground",
  ].join(" ");
}

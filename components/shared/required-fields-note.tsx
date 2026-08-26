/**
 * Nota al pie de un formulario que aclara la convención del asterisco.
 * Se usa junto con `<Label required>` para que se identifique de un vistazo
 * qué campos son obligatorios.
 */
export function RequiredFieldsNote({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-xs text-muted-foreground"}>
      <span aria-hidden="true" className="text-destructive">
        *
      </span>{" "}
      Campo obligatorio
    </p>
  );
}

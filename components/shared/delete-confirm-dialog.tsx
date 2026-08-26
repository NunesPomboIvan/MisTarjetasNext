"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteScopeAction {
  label: string;
  onClick: () => void;
}

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  /** Controlado por el padre: true mientras corre el borrado */
  pending: boolean;
  /** Texto de los botones mientras `pending`. Default: "Eliminando…" */
  pendingLabel?: string;
  /** Caso simple: una sola acción de borrado */
  onConfirm?: () => void;
  /** Texto del botón de borrado (caso simple). Default: "Eliminar" */
  confirmLabel?: string;
  /**
   * Caso "elegir alcance" (ej: consumo fijo mensual → solo este mes / todos).
   * Si se pasa, reemplaza a `onConfirm`/`confirmLabel`.
   */
  actions?: DeleteScopeAction[];
}

const DESTRUCTIVE_CLASS = "bg-destructive text-white hover:bg-destructive/90";

/**
 * Diálogo de confirmación de borrado con estado de progreso unificado:
 * mientras `pending`, todos los botones quedan deshabilitados y el/los
 * botón(es) de borrado muestran "Eliminando…". Evita que la inconsistencia
 * de feedback se repita entre distintos puntos de entrada.
 */
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  pending,
  pendingLabel = "Eliminando…",
  onConfirm,
  confirmLabel = "Eliminar",
  actions,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {actions ? (
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            {actions.map((action) => (
              <AlertDialogAction
                key={action.label}
                onClick={action.onClick}
                disabled={pending}
                className={`w-full ${DESTRUCTIVE_CLASS}`}
              >
                {pending ? pendingLabel : action.label}
              </AlertDialogAction>
            ))}
            <AlertDialogCancel className="w-full" disabled={pending}>
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        ) : (
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              disabled={pending}
              className={DESTRUCTIVE_CLASS}
            >
              {pending ? pendingLabel : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

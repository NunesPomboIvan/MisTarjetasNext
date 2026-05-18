"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { cardSchema, type CardFormData } from "@/lib/schemas/card";
import { createCard, updateCard } from "@/actions/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AmountInput } from "@/components/expenses/amount-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { cn, formatCurrency } from "@/lib/utils";
import { getCurrentPeriod, parseLocalDate } from "@/lib/periods/calculate";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Card } from "@/lib/supabase/database.types";

const CARD_TYPES = [
  { value: "visa",       label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "amex",       label: "American Express" },
  { value: "naranja",    label: "Naranja" },
  { value: "cabal",      label: "Cabal" },
  { value: "other",      label: "Otra" },
] as const;

const COLOR_PRESETS = [
  "#f97316", "#ef4444", "#eab308", "#1a7a46",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
];

/** Parent shape: necesitamos los datos completos para copiar al activar "adicional" */
export type ParentCardOption = Pick<
  Card,
  | "id"
  | "name"
  | "last_four"
  | "bank"
  | "type"
  | "close_date"
  | "due_date"
  | "color"
  | "credit_limit"
>;

interface CardFormProps {
  card?: Card;
  /** Lista de tarjetas titulares para el selector de extensión */
  availableParents?: ParentCardOption[];
  /** Si se crea desde otro flujo (ej: carga de consumo), a dónde volver con la tarjeta nueva */
  returnTo?: string;
}

/** Convierte un Date a YYYY-MM-DD usando hora local */
function toLocalDateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function CardForm({ card, availableParents = [], returnTo }: CardFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /** Fechas iniciales: si estamos editando, mostramos el período actual de esa tarjeta.
   *  Las dos fechas se muestran en el MISMO mes (el del cierre del período actual)
   *  porque para el cálculo solo importa el día — así el form queda visualmente coherente.
   *  Si es nueva, dejamos vacío y el usuario las elige. */
  const initialPeriodDates = useMemo(() => {
    if (!card) return { close_date: "", due_date: "" };
    const p = getCurrentPeriod(card);
    const closeDay = parseLocalDate(card.close_date).getDate();
    const dueDay = parseLocalDate(card.due_date).getDate();
    const refYear = p.end.getFullYear();
    const refMonth = p.end.getMonth(); // 0-based
    return {
      close_date: toLocalDateStr(new Date(refYear, refMonth, closeDay)),
      due_date: toLocalDateStr(new Date(refYear, refMonth, dueDay)),
    };
  }, [card]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CardFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(cardSchema) as any,
    defaultValues: card
      ? {
          name: card.name,
          type: card.type,
          last_four: card.last_four,
          close_date: initialPeriodDates.close_date,
          due_date: initialPeriodDates.due_date,
          color: card.color,
          bank: card.bank ?? undefined,
          is_extension: card.is_extension,
          parent_card_id: card.parent_card_id ?? undefined,
          credit_limit: card.credit_limit ?? undefined,
          holder_name: card.holder_name ?? undefined,
          expiry: card.expiry ?? undefined,
          archived: card.archived,
        }
      : {
          color: "#6366f1",
          is_extension: false,
          archived: false,
        } as Partial<CardFormData>,
  });

  const selectedColor = watch("color");
  const isExtension = watch("is_extension");
  const parentCardId = watch("parent_card_id");
  const closeDate = watch("close_date");
  const dueDate = watch("due_date");
  const bankValue = watch("bank");
  const creditLimit = watch("credit_limit");

  /** Cuando se selecciona/cambia la tarjeta titular en modo "adicional",
   *  copiamos automáticamente banco, tipo, fechas, color, límite y vencimiento.
   *  El usuario solo necesita poner el nombre y datos del titular. */
  useEffect(() => {
    if (!isExtension || !parentCardId) return;
    const parent = availableParents.find((p) => p.id === parentCardId);
    if (!parent) return;

    const parentBank = parent.bank ?? parent.name ?? "";
    setValue("bank", parentBank, { shouldDirty: true });
    setValue("name", parentBank || parent.name, { shouldDirty: true, shouldValidate: true });
    setValue("type", parent.type, { shouldDirty: true });
    setValue("close_date", parent.close_date, { shouldDirty: true, shouldValidate: true });
    setValue("due_date", parent.due_date, { shouldDirty: true, shouldValidate: true });
    setValue("color", parent.color, { shouldDirty: true });
    setValue("credit_limit", parent.credit_limit ?? undefined, { shouldDirty: true });
    // last_four: en adicionales el plástico suele tener otros 4 dígitos.
    // No los copiamos: el usuario los pone manualmente.
  }, [isExtension, parentCardId, availableParents, setValue]);

  function onSubmit(data: CardFormData) {
    startTransition(async () => {
      const result = card
        ? await updateCard(card.id, data)
        : await createCard(data);

      if (result.success) {
        toast.success(card ? "Tarjeta actualizada" : "Tarjeta creada");
        if (!card && returnTo) {
          const sep = returnTo.includes("?") ? "&" : "?";
          router.push(
            result.id ? `${returnTo}${sep}card_id=${result.id}` : returnTo
          );
        } else {
          router.push(result.id ? `/cards/${result.id}` : "/cards");
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  /** Para mostrar el label legible (nombre •••• 1234) en el trigger del Select de titular */
  const selectedParent = availableParents.find((p) => p.id === parentCardId);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Extensión toggle — primero para que fluya el formulario */}
      {availableParents.length > 0 && (
        <div className="rounded-[16px] border border-border bg-muted/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold text-foreground">Tarjeta adicional</p>
              <p className="text-[12px] text-muted-foreground">Es extensión de otra tarjeta</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isExtension}
              onClick={() => {
                const next = !isExtension;
                setValue("is_extension", next);
                if (!next) setValue("parent_card_id", null);
              }}
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                isExtension ? "bg-primary" : "bg-input"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200",
                  isExtension ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {isExtension && (
            <div className="space-y-1.5">
              <Label>Tarjeta titular</Label>
              <Select
                value={parentCardId ?? undefined}
                onValueChange={(v) => setValue("parent_card_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná la tarjeta titular">
                    {selectedParent
                      ? `${selectedParent.name} •••• ${selectedParent.last_four}`
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableParents
                    .filter((p) => p.id !== card?.id)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} •••• {p.last_four}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {parentCardId && (
                <p className="text-[11.5px] text-muted-foreground">
                  Banco, fechas y límite se copian del titular. Solo cambiá el nombre y el
                  titular del adicional.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Resumen de datos heredados del titular (modo adicional) */}
      {isExtension && selectedParent && (
        <div className="rounded-[16px] border border-border bg-muted/40 p-4 space-y-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Datos de la tarjeta titular
          </p>
          <dl className="space-y-2.5 text-[13.5px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Banco o entidad</dt>
              <dd className="flex items-center gap-2 font-semibold text-foreground">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: selectedParent.color }}
                />
                {selectedParent.bank || selectedParent.name}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Tipo de tarjeta</dt>
              <dd className="font-semibold text-foreground">
                {CARD_TYPES.find((t) => t.value === selectedParent.type)?.label ??
                  selectedParent.type}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Fecha de cierre</dt>
              <dd className="font-semibold text-foreground tabular-nums">
                {format(parseLocalDate(selectedParent.close_date), "d 'de' MMM", { locale: es })}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Fecha de vencimiento</dt>
              <dd className="font-semibold text-foreground tabular-nums">
                {format(parseLocalDate(selectedParent.due_date), "d 'de' MMM", { locale: es })}
              </dd>
            </div>
            {selectedParent.credit_limit != null && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Límite de crédito</dt>
                <dd className="font-semibold text-foreground tabular-nums">
                  {formatCurrency(selectedParent.credit_limit)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Banco / Entidad — también se usa como nombre de la tarjeta */}
      {!isExtension && (
      <div className="space-y-1.5">
        <Label htmlFor="bank">Banco o entidad</Label>
        <Input
          id="bank"
          placeholder="Ej: Galicia, Santander, BBVA…"
          autoFocus={!card}
          disabled={isExtension}
          className={cn((errors.bank || errors.name) && "border-destructive")}
          value={bankValue ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            setValue("bank", v, { shouldDirty: true, shouldValidate: true });
            setValue("name", v, { shouldDirty: true, shouldValidate: true });
          }}
        />
        {(errors.bank || errors.name) && (
          <p className="text-xs text-destructive">
            {errors.bank?.message || errors.name?.message}
          </p>
        )}
      </div>
      )}

      {/* Tipo */}
      {!isExtension && (
      <div className="space-y-1.5">
        <Label>Tipo de tarjeta</Label>
        <Select
          value={watch("type") ?? undefined}
          onValueChange={(v) => setValue("type", v as CardFormData["type"])}
          disabled={isExtension}
        >
          <SelectTrigger className={cn(errors.type && "border-destructive")}>
            <SelectValue placeholder="Seleccioná el tipo" />
          </SelectTrigger>
          <SelectContent>
            {CARD_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
      </div>
      )}

      {/* Últimos 4 dígitos */}
      <div className="space-y-1.5">
        <Label htmlFor="last_four">Últimos 4 dígitos</Label>
        <Input
          id="last_four"
          placeholder="1234"
          maxLength={4}
          inputMode="numeric"
          pattern="[0-9]{4}"
          className={cn(errors.last_four && "border-destructive")}
          {...register("last_four")}
        />
        {errors.last_four && (
          <p className="text-xs text-destructive">{errors.last_four.message}</p>
        )}
      </div>

      {/* Nombre del titular */}
      <div className="space-y-1.5">
        <Label htmlFor="holder_name">Nombre del titular <span className="text-muted-foreground font-normal">(opcional)</span></Label>
        <Input
          id="holder_name"
          placeholder="Ej: Juan Pérez"
          {...register("holder_name")}
        />
      </div>

      {!isExtension && (
      <>
      {/* Límite de crédito */}
      <div className="space-y-1.5">
        <Label htmlFor="credit_limit">
          Límite de crédito{" "}
          <span className="text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <div
          className={cn(isExtension && "pointer-events-none opacity-60")}
          aria-disabled={isExtension}
        >
          <AmountInput
            id="credit_limit"
            value={creditLimit ?? null}
            onChange={(v) =>
              setValue("credit_limit", v ?? null, { shouldDirty: true, shouldValidate: true })
            }
            placeholder="20.000,00"
            invalid={!!errors.credit_limit}
          />
        </div>
        {errors.credit_limit && (
          <p className="text-xs text-destructive">{errors.credit_limit.message}</p>
        )}
      </div>

      {/* Fechas — bloqueadas en adicionales */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Fecha de cierre</Label>
          <DatePickerField
            value={closeDate ?? ""}
            onChange={(v) => setValue("close_date", v, { shouldDirty: true, shouldValidate: true })}
            disabled={isExtension}
            placeholder="Día de cierre"
            className={cn(errors.close_date && "border-destructive")}
          />
          {errors.close_date && (
            <p className="text-xs text-destructive">{errors.close_date.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Fecha de vencimiento</Label>
          <DatePickerField
            value={dueDate ?? ""}
            onChange={(v) => setValue("due_date", v, { shouldDirty: true, shouldValidate: true })}
            disabled={isExtension}
            placeholder="Día de vencimiento"
            className={cn(errors.due_date && "border-destructive")}
          />
          {errors.due_date && (
            <p className="text-xs text-destructive">{errors.due_date.message}</p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-3">
        Solo importa el <strong>día del mes</strong>. Cada mes el período cierra y vence en esos días.
      </p>

      {/* Color */}
      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              disabled={isExtension}
              className={cn(
                "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 disabled:opacity-50",
                selectedColor === color ? "border-foreground scale-110" : "border-transparent"
              )}
              style={{ backgroundColor: color }}
              onClick={() => setValue("color", color)}
            />
          ))}
          <input
            type="color"
            value={selectedColor ?? "#f97316"}
            disabled={isExtension}
            onChange={(e) => setValue("color", e.target.value)}
            className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0 disabled:opacity-50"
            title="Color personalizado"
          />
        </div>
      </div>
      </>
      )}

      {/* Submit */}
      <Button
        type="submit"
        className="gradient-primary shadow-brand w-full font-semibold"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {card ? "Guardando..." : "Creando..."}
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            {card ? "Guardar cambios" : "Crear tarjeta"}
          </>
        )}
      </Button>
    </form>
  );
}

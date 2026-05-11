"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { cardSchema, type CardFormData } from "@/lib/schemas/card";
import { createCard, updateCard } from "@/actions/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
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
  "#f97316", "#ef4444", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
];

interface CardFormProps {
  card?: Card;
  /** Lista de tarjetas titulares para el selector de extensión */
  availableParents?: Pick<Card, "id" | "name" | "last_four">[];
}

export function CardForm({ card, availableParents = [] }: CardFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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
          close_date: card.close_date,
          due_date: card.due_date,
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

  function onSubmit(data: CardFormData) {
    startTransition(async () => {
      const result = card
        ? await updateCard(card.id, data)
        : await createCard(data);

      if (result.success) {
        toast.success(card ? "Tarjeta actualizada" : "Tarjeta creada");
        router.push(result.id ? `/cards/${result.id}` : "/cards");
      } else {
        toast.error(result.error);
      }
    });
  }

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
                defaultValue={card?.parent_card_id ?? undefined}
                onValueChange={(v) => setValue("parent_card_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná la tarjeta titular" />
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
            </div>
          )}
        </div>
      )}

      {/* Banco (opcional) */}
      <div className="space-y-1.5">
        <Label htmlFor="bank">Banco <span className="text-muted-foreground font-normal">(opcional)</span></Label>
        <Input
          id="bank"
          placeholder="Ej: Galicia, Santander, BBVA…"
          {...register("bank")}
        />
      </div>

      {/* Nombre */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre de la tarjeta</Label>
        <Input
          id="name"
          placeholder="Ej: Visa Galicia"
          autoFocus={!card}
          className={cn(errors.name && "border-destructive")}
          {...register("name")}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Tipo */}
      <div className="space-y-1.5">
        <Label>Tipo de tarjeta</Label>
        <Select
          defaultValue={card?.type}
          onValueChange={(v) => setValue("type", v as CardFormData["type"])}
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

      {/* Últimos 4 + Vencimiento */}
      <div className="grid grid-cols-2 gap-4">
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
        <div className="space-y-1.5">
          <Label htmlFor="expiry">Vence (MM/YY) <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Input
            id="expiry"
            placeholder="05/27"
            maxLength={5}
            inputMode="numeric"
            className={cn(errors.expiry && "border-destructive")}
            {...register("expiry")}
          />
          {errors.expiry && (
            <p className="text-xs text-destructive">{errors.expiry.message}</p>
          )}
        </div>
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

      {/* Límite de crédito */}
      <div className="space-y-1.5">
        <Label htmlFor="credit_limit">Límite de crédito <span className="text-muted-foreground font-normal">(opcional)</span></Label>
        <Input
          id="credit_limit"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          placeholder="20000"
          className={cn(errors.credit_limit && "border-destructive")}
          {...register("credit_limit", { setValueAs: (v) => v === "" ? null : Number(v) })}
        />
        {errors.credit_limit && (
          <p className="text-xs text-destructive">{errors.credit_limit.message}</p>
        )}
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="close_date">Fecha de cierre</Label>
          <Input
            id="close_date"
            type="date"
            className={cn(errors.close_date && "border-destructive")}
            {...register("close_date")}
          />
          {errors.close_date && (
            <p className="text-xs text-destructive">{errors.close_date.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="due_date">Fecha de vencimiento</Label>
          <Input
            id="due_date"
            type="date"
            className={cn(errors.due_date && "border-destructive")}
            {...register("due_date")}
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
              className={cn(
                "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                selectedColor === color ? "border-foreground scale-110" : "border-transparent"
              )}
              style={{ backgroundColor: color }}
              onClick={() => setValue("color", color)}
            />
          ))}
          <input
            type="color"
            value={selectedColor ?? "#f97316"}
            onChange={(e) => setValue("color", e.target.value)}
            className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
            title="Color personalizado"
          />
        </div>
      </div>

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

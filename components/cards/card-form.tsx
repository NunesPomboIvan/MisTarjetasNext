"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useState } from "react";
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
  card?: Card; // Si existe, es modo edición
}

export function CardForm({ card }: CardFormProps) {
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
          close_day: card.close_day,
          due_day: card.due_day,
          color: card.color,
          archived: card.archived,
        }
      : {
          color: "#f97316",
          archived: false,
          installments: 1,
        } as Partial<CardFormData>,
  });

  const selectedColor = watch("color");
  const selectedType = watch("type");

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

      {/* Últimos 4 dígitos */}
      <div className="space-y-1.5">
        <Label htmlFor="last_four">Últimos 4 dígitos</Label>
        <Input
          id="last_four"
          placeholder="1234"
          maxLength={4}
          inputMode="numeric"
          pattern="[0-9]{4}"
          className={cn(errors.last_four && "border-destructive", "w-28")}
          {...register("last_four")}
        />
        {errors.last_four && (
          <p className="text-xs text-destructive">{errors.last_four.message}</p>
        )}
      </div>

      {/* Días */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="close_day">Día de cierre</Label>
          <Input
            id="close_day"
            type="number"
            min={1}
            max={31}
            placeholder="23"
            inputMode="numeric"
            className={cn(errors.close_day && "border-destructive")}
            {...register("close_day", { valueAsNumber: true })}
          />
          {errors.close_day && (
            <p className="text-xs text-destructive">{errors.close_day.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="due_day">Día de vencimiento</Label>
          <Input
            id="due_day"
            type="number"
            min={1}
            max={31}
            placeholder="10"
            inputMode="numeric"
            className={cn(errors.due_day && "border-destructive")}
            {...register("due_day", { valueAsNumber: true })}
          />
          {errors.due_day && (
            <p className="text-xs text-destructive">{errors.due_day.message}</p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-3">
        Si la tarjeta cierra el 23 y vence el 10, el período de marzo cubre del 24/feb al 23/mar y vence el 10/abr.
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

"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface DatePickerFieldProps {
  value: string; // YYYY-MM-DD or ""
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function DatePickerField({
  value,
  onChange,
  disabled,
  placeholder = "Elegí una fecha",
  className,
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false);

  const selected = value ? parseISO(value) : undefined;

  function handleSelect(day: Date | undefined) {
    if (!day) return;
    onChange(format(day, "yyyy-MM-dd"));
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(true)}
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          !selected && "text-muted-foreground",
          className
        )}
      >
        <span>
          {selected
            ? format(selected, "d 'de' MMM yyyy", { locale: es })
            : placeholder}
        </span>
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" showCloseButton className="pb-safe">
          <SheetHeader>
            <SheetTitle>Elegí una fecha</SheetTitle>
          </SheetHeader>
          <div className="flex justify-center py-2">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              locale={es}
              captionLayout="dropdown"
              startMonth={new Date(2020, 0)}
              endMonth={new Date(2035, 11)}
              defaultMonth={selected ?? new Date()}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

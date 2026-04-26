"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPeriodByOffset, getCurrentPeriod } from "@/lib/periods/calculate";
import { formatDate } from "@/lib/utils";
import type { CardForPeriod, Period } from "@/lib/periods/calculate";

interface PeriodNavigatorProps {
  card: CardForPeriod;
  currentPeriod: Period;
}

const STATUS_STYLES = {
  current: "border-green-500 text-green-600 dark:text-green-400",
  past:    "border-border text-muted-foreground",
  future:  "border-orange-400 text-orange-500",
};

export function PeriodNavigator({ card, currentPeriod }: PeriodNavigatorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const offset = parseInt(searchParams.get("offset") ?? "0");

  function navigate(newOffset: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (newOffset === 0) {
      params.delete("offset");
    } else {
      params.set("offset", newOffset.toString());
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const isCurrentMonth = currentPeriod.status === "current" && offset === 0;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-xl"
        onClick={() => navigate(offset - 1)}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{currentPeriod.label}</span>
          <Badge
            variant="outline"
            className={STATUS_STYLES[currentPeriod.status]}
          >
            {currentPeriod.status === "current"
              ? "Actual"
              : currentPeriod.status === "future"
              ? "Próximo"
              : "Pasado"}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDate(currentPeriod.start, "d MMM")} → {formatDate(currentPeriod.end, "d MMM")} · vence {formatDate(currentPeriod.due, "d/M")}
        </span>
        {!isCurrentMonth && (
          <button
            onClick={() => navigate(0)}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Ir al actual
          </button>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-xl"
        onClick={() => navigate(offset + 1)}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

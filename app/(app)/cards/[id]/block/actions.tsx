"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { toggleCardArchived } from "@/actions/cards";

interface BlockCardActionsProps {
  cardId: string;
  archived: boolean;
}

export function BlockCardActions({ cardId, archived }: BlockCardActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleCardArchived(cardId, !archived);
      if (result.success) {
        toast.success(archived ? "Tarjeta activada" : "Tarjeta bloqueada");
        router.push(`/cards/${cardId}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={
          "flex h-12 w-full items-center justify-center gap-2 rounded-full font-semibold text-white transition-transform active:scale-[0.98] " +
          (archived ? "bg-primary" : "bg-destructive")
        }
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {archived ? "Activar tarjeta" : "Bloquear tarjeta"}
      </button>
      {!archived && (
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className="block w-full text-center text-[13px] font-semibold text-primary"
        >
          Bloquear temporalmente
        </button>
      )}
    </div>
  );
}

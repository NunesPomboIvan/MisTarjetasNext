"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      try {
        localStorage.removeItem("mt_auth_v1");
        localStorage.removeItem("mt_auth_email");
      } catch {}
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={isPending}
      className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-border bg-card px-4 py-3.5 text-[14px] font-semibold text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      Cerrar sesión
    </button>
  );
}

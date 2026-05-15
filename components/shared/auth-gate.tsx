"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "mt_auth_v1";

/**
 * Gate de autenticación local: si no hay sesión guardada en localStorage,
 * redirige a /login. Una vez logueado se persiste y no se vuelve a pedir.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    try {
      const ok = localStorage.getItem(STORAGE_KEY) === "1";
      if (!ok) {
        router.replace("/login");
        return;
      }
    } catch {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VALID_EMAIL = "nunespomboivan@gmail.com";
const VALID_PASSWORD = "Chaca123";
const STORAGE_KEY = "mt_auth_v1";
const EMAIL_KEY = "mt_auth_email";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Si ya estaba autenticado, entrar directo
  React.useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1") {
        router.replace("/");
      }
    } catch {}
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const okEmail = email.trim().toLowerCase() === VALID_EMAIL;
    const okPass = password === VALID_PASSWORD;

    if (!okEmail || !okPass) {
      setError("Email o contraseña incorrectos");
      setSubmitting(false);
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, "1");
      localStorage.setItem(EMAIL_KEY, email.trim());
    } catch {}
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-brand text-white text-2xl">
            💳
          </div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-foreground">
            Mis Tarjetas
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Ingresá para continuar
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-[20px] border border-border bg-card p-5 shadow-sm"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoFocus
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className={cn("text-xs font-medium text-destructive")}>{error}</p>
          )}

          <Button
            type="submit"
            className="gradient-primary shadow-brand w-full font-semibold"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ingresando...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Ingresar
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

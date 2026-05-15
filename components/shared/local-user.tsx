"use client";

import * as React from "react";

const EMAIL_KEY = "mt_auth_email";

function deriveName(email: string | null): string {
  if (!email) return "";
  const localPart = email.split("@")[0] ?? "";
  const first = localPart.split(/[._\-0-9]/)[0] ?? "";
  if (!first) return "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function useLocalEmail(): string | null {
  const [email, setEmail] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      setEmail(localStorage.getItem(EMAIL_KEY));
    } catch {}
  }, []);
  return email;
}

/** Muestra el email guardado en localStorage (post-login). */
export function LocalUserEmail({
  fallback = "",
  className,
}: {
  fallback?: string;
  className?: string;
}) {
  const email = useLocalEmail();
  return <span className={className}>{email ?? fallback}</span>;
}

/** Muestra el nombre derivado del email guardado en localStorage. */
export function LocalUserName({
  fallback = "",
  className,
}: {
  fallback?: string;
  className?: string;
}) {
  const email = useLocalEmail();
  const name = deriveName(email) || fallback;
  return <span className={className}>{name}</span>;
}

/** Inicial (1 letra) derivada del email/nombre, para el avatar. */
export function LocalUserInitial({
  fallback = "U",
  className,
}: {
  fallback?: string;
  className?: string;
}) {
  const email = useLocalEmail();
  const name = deriveName(email);
  const initial = (name || email || fallback).charAt(0).toUpperCase() || fallback;
  return <span className={className}>{initial}</span>;
}

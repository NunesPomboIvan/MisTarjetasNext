"use client";

import * as React from "react";
import Link from "next/link";
import { useNavigationBlocker } from "./navigation-blocker";

type GuardedLinkProps = React.ComponentProps<typeof Link>;

/**
 * `<Link>` de Next que, si hay un formulario con cambios sin guardar
 * (`useUnsavedChangesGuard`), pide confirmación antes de navegar.
 * Se usa en `BackButton` y `BottomNav`. Patrón oficial de Next (onNavigate).
 */
export function GuardedLink({ onNavigate, ...props }: GuardedLinkProps) {
  const { isBlocked, message } = useNavigationBlocker();

  return (
    <Link
      {...props}
      onNavigate={(e) => {
        if (isBlocked && !window.confirm(message)) {
          e.preventDefault();
          return;
        }
        onNavigate?.(e);
      }}
    />
  );
}

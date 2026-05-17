"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveSearchProps {
  basePath: string;
  placeholder?: string;
  className?: string;
}

export function LiveSearch({ basePath, placeholder = "Buscar...", className }: LiveSearchProps) {
  const router = useRouter();
  const sp = useSearchParams();

  const spQ = sp.get("q") ?? "";
  const [value, setValue] = React.useState(spQ);
  const [lastSpQ, setLastSpQ] = React.useState(spQ);
  if (spQ !== lastSpQ) {
    setLastSpQ(spQ);
    setValue(spQ);
  }

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(sp.toString());
      if (next) params.set("q", next);
      else params.delete("q");
      const qs = params.toString();
      router.push(qs ? `${basePath}?${qs}` : basePath);
    }, 300);
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 text-[14px] placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />
    </div>
  );
}

import Link from "next/link";
import { Money } from "@/components/shared/money";
import { formatWeekdayLongDate } from "@/lib/utils";

interface PagoRowProps {
  href: string;
  accent: string;
  icon: React.ReactNode;
  title: string;
  suffix: string;
  dueDate: Date;
  amount: number;
  daysUntil: number;
}

export function PagoRow({ href, accent, icon, title, suffix, dueDate, amount, daysUntil }: PagoRowProps) {
  const isToday = daysUntil <= 0;
  const isUrgent = daysUntil <= 1;

  return (
    <Link
      href={href}
      className="block rounded-[20px] border border-white/[0.08] bg-card/85 p-4 backdrop-blur-xl transition-all active:scale-[0.985]"
      style={{
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        boxShadow:
          "0 0 28px -8px rgba(91,143,214,0.22), 0 14px 40px -16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: `${accent}20`, color: accent }}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-foreground">
            {title}
            <span className="ml-1.5 text-[12px] font-normal tabular-nums text-muted-foreground">
              {suffix}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {formatWeekdayLongDate(dueDate)}
          </p>
          <Money
            amount={amount}
            className="mt-1 block text-[13px] font-semibold tabular-nums text-foreground"
          />
        </div>

        <div className="flex-shrink-0 text-right">
          {isToday ? (
            <p
              className={
                "font-display text-[15px] font-bold leading-none " +
                (isUrgent ? "text-destructive" : "text-foreground")
              }
            >
              Hoy
            </p>
          ) : (
            <div className="flex items-baseline justify-end gap-1">
              <p
                className={
                  "font-display text-[18px] font-bold leading-none tabular-nums " +
                  (isUrgent ? "text-destructive" : "text-foreground")
                }
              >
                {daysUntil}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {daysUntil === 1 ? "día" : "días"}
              </p>
            </div>
          )}
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            para vencer
          </p>
        </div>
      </div>
    </Link>
  );
}

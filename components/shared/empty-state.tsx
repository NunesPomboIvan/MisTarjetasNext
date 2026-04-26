import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center",
        className
      )}
    >
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-2xl">
          {icon}
        </div>
      )}
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className={cn(
              "inline-flex h-7 items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium text-white gradient-primary shadow-brand mt-1 transition-all"
            )}
          >
            {action.label}
          </Link>
        ) : (
          <Button size="sm" className="gradient-primary shadow-brand mt-1" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}

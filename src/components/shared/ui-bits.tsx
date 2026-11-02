import Link from "next/link";
import { InfoIcon, type LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ACCENTS, type Accent } from "@/components/layout/nav-items";

export { PageHeader } from "./page-header";

export function InfoTooltip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Más información"
          className={cn("inline-flex align-middle text-muted-foreground hover:text-foreground", className)}
        >
          <InfoIcon className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-pretty">{children}</TooltipContent>
    </Tooltip>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  example,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  /** Ejemplo concreto para inspirar la primera carga. */
  example?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="rounded-full bg-halo/30 p-3 text-tinta dark:bg-halo/15 dark:text-halo">
          <Icon className="size-6" />
        </div>
        <div>
          <p className="font-medium">{title}</p>
          {description && (
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground text-pretty">{description}</p>
          )}
        </div>
        {example && (
          <div className="mt-1 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{example}</div>
        )}
        {action && (
          <Button asChild className="mt-2">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  accent,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "good" | "warn" | "bad";
  /** Color de la tarjeta (fondo suave + ícono). */
  accent?: Accent;
}) {
  const toneClass = {
    default: "text-foreground",
    good: "text-tinta dark:text-menta",
    warn: "text-[#9a5b13] dark:text-[#f0c27a]",
    bad: "text-destructive",
  }[tone];
  const a = accent ? ACCENTS[accent] : null;
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <span>{label}</span>
          {Icon && (
            <span className={cn("grid size-8 place-items-center rounded-lg", a ? a.solid : "bg-muted")}>
              <Icon className="size-4" />
            </span>
          )}
        </div>
        <div className={cn("mt-1 text-xl font-bold tracking-tight break-words tabular-nums min-[400px]:text-2xl sm:text-3xl", toneClass)}>{value}</div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium leading-none">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError message={error} />
    </div>
  );
}

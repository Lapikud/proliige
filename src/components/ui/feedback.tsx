import type { FC, ReactNode } from "react";
import { cn } from "~/lib/utils";

interface StateProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export const EmptyState: FC<StateProps> = ({ title, description, children }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card/70 px-6 py-12 text-center">
    <p className="text-sm font-bold text-foreground">{title}</p>
    {description && <p className="max-w-prose text-sm text-muted-foreground">{description}</p>}
    {children}
  </div>
);

type ErrorStateProps = Partial<StateProps>;

export const ErrorState: FC<ErrorStateProps> = ({
  title = "Something went wrong",
  description,
  children,
}) => (
  <div
    role="alert"
    className="flex flex-col items-start gap-2 rounded-xl border border-destructive/30 bg-destructive-soft px-4 py-3"
  >
    <p className="text-sm font-medium text-destructive">{title}</p>
    {description && <p className="text-sm text-foreground/80">{description}</p>}
    {children}
  </div>
);

interface NoticeProps {
  children: ReactNode;
  className?: string;
}

export const Notice: FC<NoticeProps> = ({ children, className }) => (
  <p
    className={cn(
      "rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground/80 shadow-card",
      className,
    )}
  >
    {children}
  </p>
);

type StatusPageProps = StateProps & { code?: string };

export const StatusPage: FC<StatusPageProps> = ({ code, title, description, children }) => (
  <section className="mx-auto flex max-w-md flex-col items-start gap-3 py-12">
    {code && <p className="text-sm font-semibold text-brand-ink tabular-nums">{code}</p>}
    <h1 className="font-heading text-2xl font-bold tracking-wide uppercase">{title}</h1>
    {description && <p className="text-sm text-muted-foreground">{description}</p>}
    {children}
  </section>
);

interface SkeletonProps {
  className?: string;
}

export const Skeleton: FC<SkeletonProps> = ({ className }) => (
  <div aria-hidden="true" className={cn("animate-pulse rounded-xl bg-muted", className)} />
);

interface ListSkeletonProps {
  rows?: number;
}

export const ListSkeleton: FC<ListSkeletonProps> = ({ rows = 3 }) => (
  <div className="flex flex-col gap-3" aria-busy="true">
    <span className="sr-only">Loading…</span>
    {Array.from({ length: rows }, (_, index) => (
      <Skeleton key={index} className="h-24 w-full" />
    ))}
  </div>
);

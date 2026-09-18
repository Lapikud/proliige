import type { FC, ReactNode } from "react";

interface Props {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export const Page: FC<Props> = ({ title, description, actions, children }) => (
  <div className="flex flex-col gap-5 sm:gap-6">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-bold tracking-wide uppercase sm:text-4xl">
          {title}
        </h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </header>
    {children}
  </div>
);

import type { FC } from "react";

export const CategoryTitle: FC<{ readonly name: string; readonly count: number }> = ({
  name,
  count,
}) => (
  <span className="min-w-0 truncate text-lg">
    {name} <span className="text-sm font-medium text-muted-foreground tabular-nums">· {count}</span>
  </span>
);

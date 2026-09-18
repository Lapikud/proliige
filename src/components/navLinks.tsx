"use client";

import {
  Bell,
  FileCheck,
  GitPullRequest,
  House,
  ListChecks,
  LogIn,
  type LucideIcon,
  Settings2,
  Tags,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FC } from "react";
import type { NavItem } from "~/lib/navigation";
import { cn } from "~/lib/utils";

const icons = {
  feed: House,
  tasks: ListChecks,
  proofs: FileCheck,
  review: GitPullRequest,
  manage: Settings2,
  categories: Tags,
  alerts: Bell,
  signIn: LogIn,
} satisfies Record<NavItem["icon"], LucideIcon>;

function isCurrent(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export const HeaderNav: FC<{ items: ReadonlyArray<NavItem> }> = ({ items }) => {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {items
        .filter((item) => item.only !== "mobile")
        .map((item) => {
          const current = isCurrent(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-bold",
                current
                  ? "bg-primary text-primary-foreground"
                  : "text-white/80 hover:bg-white/10 hover:text-white",
              )}
            >
              {item.label}
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 font-mono text-[11px]",
                    current ? "bg-foreground text-primary" : "bg-primary text-primary-foreground",
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
    </nav>
  );
};

export const TabBar: FC<{ items: ReadonlyArray<NavItem> }> = ({ items }) => {
  const pathname = usePathname();
  const tabs = items.filter((item) => item.only !== "desktop");

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-card px-1 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_-20px_rgb(30_30_30/0.4)] md:hidden"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((item) => {
        const current = isCurrent(pathname, item.href);
        const Icon = icons[item.icon];

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-bold",
              current ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "relative inline-flex rounded-full px-3.5 py-1",
                current && "bg-primary",
              )}
            >
              <Icon aria-hidden="true" className="size-[22px]" />
              {item.count !== undefined && item.count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-foreground px-1 text-center font-mono text-[10px] leading-4 text-primary">
                  {item.count}
                </span>
              )}
            </span>
            {item.shortLabel ?? item.label}
          </Link>
        );
      })}
    </nav>
  );
};

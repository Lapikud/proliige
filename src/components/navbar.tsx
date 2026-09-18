import Image from "next/image";
import Link from "next/link";
import type { FC } from "react";
import { userCanReviewProofs } from "~/domain/rules";
import { proofService } from "~/infra";
import { navItemsFor } from "~/lib/navigation";
import { getUser } from "~/lib/user";
import { SignOutButton } from "./auth/signOutButton";
import { HeaderNav, TabBar } from "./navLinks";
import { NotificationBell } from "./notifications/bell";
import { UserAvatar } from "./ui/avatar";
import { Button } from "./ui/button";

export const Navbar: FC = async () => {
  const user = await getUser();
  const reviewRequests = userCanReviewProofs(user)
    ? (await proofService.listPendingProofs(user)).filter((entry) =>
        entry.requestedReviewers.some((reviewer) => reviewer.id === user.id),
      ).length
    : 0;
  const items = navItemsFor(user, reviewRequests);

  return (
    <>
      <header className="relative bg-ink text-white">
        <div className="relative z-10 mx-auto flex h-16 w-full max-w-5xl items-center gap-4 px-4 sm:px-6 md:h-[76px]">
          <Link href="/" className="shrink-0 rounded-lg">
            <Image
              src="/brand/lapikud-logo-light.svg"
              alt="Lapikud"
              width={98}
              height={36}
              priority
              unoptimized
              className="h-8 w-auto md:h-9"
            />
          </Link>

          <HeaderNav items={items} />

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {user ? (
              <>
                <NotificationBell user={user} />
                <span className="hidden items-center gap-2 pl-1 text-sm font-bold lg:inline-flex">
                  <UserAvatar
                    name={user.displayName}
                    className="size-8 bg-primary text-primary-foreground"
                  />
                  {user.displayName}
                </span>
                <UserAvatar
                  name={user.displayName}
                  className="size-8 bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-foreground lg:hidden"
                />
                <SignOutButton className="hidden text-white hover:bg-white/10 md:inline-flex" />
              </>
            ) : (
              <Button asChild size="sm" variant="outline" className="hidden md:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 hidden w-28 bg-stripes-wide xl:block"
        />
      </header>
      <div aria-hidden="true" className="h-1.5 bg-stripes md:hidden" />
      <TabBar items={items} />
    </>
  );
};

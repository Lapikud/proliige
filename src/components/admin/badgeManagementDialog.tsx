"use client";

import Image from "next/image";
import type { FC } from "react";
import type { RecognitionBadge } from "~/core/ports/recognition";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { EmptyState } from "~/components/ui/feedback";
import { BadgeCreator } from "./badgeCreator";

interface Props {
  open: boolean;
  badges: ReadonlyArray<RecognitionBadge>;
  onOpenChange: (open: boolean) => void;
  onBadgeCreated: (badge: RecognitionBadge) => void;
}

export const BadgeManagementDialog: FC<Props> = ({
  open,
  badges,
  onOpenChange,
  onBadgeCreated,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[min(90dvh,800px)] max-w-xl overflow-y-auto">
      <header className="flex items-start justify-between gap-4">
        <div>
          <DialogTitle className="text-xl font-black">Manage badges</DialogTitle>
          <DialogDescription className="mt-1">
            Create reusable badges with optional images. They are available in recognition awards
            and remain in recipients’ history.
          </DialogDescription>
        </div>
        <DialogClose asChild>
          <Button type="button" size="sm" variant="ghost">
            Close
          </Button>
        </DialogClose>
      </header>
      <div className="mt-5 flex flex-col gap-5">
        <BadgeCreator onCreated={onBadgeCreated} />
        {badges.length === 0 ? (
          <EmptyState
            title="No badges yet"
            description="Add a badge to offer it when recognizing a contribution."
          />
        ) : (
          <section aria-label="Saved badges">
            <h3 className="mb-2 text-sm font-bold">Saved badges · {badges.length}</h3>
            <ul className="flex list-none flex-col gap-2 p-0">
              {badges.map((badge) => (
                <li key={badge.id}>
                  <Card>
                    <CardContent className="flex items-center gap-3">
                      {badge.imageUrl ? (
                        <Image
                          src={badge.imageUrl}
                          alt=""
                          width={40}
                          height={40}
                          unoptimized
                          className="size-10 rounded-full object-cover"
                        />
                      ) : (
                        <span aria-hidden="true" className="size-10 rounded-full bg-muted" />
                      )}
                      <span className="min-w-0 flex-1 font-bold">{badge.label}</span>
                      <Badge variant="neutral">Available</Badge>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </DialogContent>
  </Dialog>
);

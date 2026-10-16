import { Award, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { FC } from "react";
import type { FeedEntryView } from "./model";
import { formatRelative } from "~/lib/utils";
import { EarnedBadges } from "../badges/earnedBadges";
import { UserAvatar } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";

export const RecognitionCard: FC<{ entry: FeedEntryView }> = ({ entry }) => (
  <Card className="overflow-hidden">
    <header className="flex items-center gap-3 px-4 py-3">
      <Link
        href={`/users/${entry.user.id}`}
        aria-label={`View ${entry.user.displayName}'s profile`}
      >
        <UserAvatar name={entry.user.displayName} className="size-9 text-xs" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-sm font-bold">{entry.user.displayName}</p>
          <EarnedBadges badges={entry.authorBadges} compact />
        </div>
        <span className="truncate text-xs text-muted-foreground">
          Recognized by {entry.reviewer?.displayName ?? "a reviewer"} ·{" "}
          <time dateTime={entry.approvedAt}>{formatRelative(entry.approvedAt)}</time>
        </span>
      </div>
      <Badge variant="points" className="tabular-nums">
        +{entry.points}
      </Badge>
    </header>
    <div className="px-4 pb-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-brand-ink">
        <Award aria-hidden="true" className="size-4" /> Contribution recognized
      </div>
      <p className="leading-relaxed text-pretty whitespace-pre-wrap">
        {entry.recognitionDescription}
      </p>
      {!!entry.badges?.length && (
        <ul aria-label="Earned badges" className="mt-3 flex list-none flex-wrap gap-2 p-0">
          {entry.badges.map((badge) => (
            <li key={badge.id}>
              <Badge variant="brand" className="gap-1.5">
                {badge.imageUrl && (
                  <Image
                    src={badge.imageUrl}
                    alt=""
                    width={24}
                    height={24}
                    unoptimized
                    className="size-6 rounded-full object-cover"
                  />
                )}
                {badge.label}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {!!entry.achievementLinks?.length && (
        <ul
          aria-label="Achievement evidence"
          className="mt-3 flex list-none flex-col gap-2 border-t border-border pt-3"
        >
          {entry.achievementLinks.map((link) => (
            <li key={`${link.title}-${link.url}`}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold text-brand-ink underline underline-offset-4"
              >
                {link.title}
                <ExternalLink aria-hidden="true" className="size-3" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  </Card>
);

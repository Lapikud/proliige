"use client";

import { Award, ExternalLink, EyeOff } from "lucide-react";
import Image from "next/image";
import { type FC, useState } from "react";
import type { RecognitionBadge } from "~/core/ports/recognition";
import { cn, formatRelative } from "~/lib/utils";
import { UserText } from "../ui/markdown";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { ClampedText } from "./clampedText";
import type { FeedEntryView } from "./model";
import { PostActions } from "./postActions";
import { PostDialog } from "./postDialog";
import { PostHeader } from "./postHeader";
import { RecognitionMenu } from "./recognitionMenu";
import { usePost } from "./usePost";

interface Props {
  entry: FeedEntryView;
  canReact: boolean;
  canModerate: boolean;
  badges: ReadonlyArray<RecognitionBadge>;
}

export const RecognitionCard: FC<Props> = ({
  entry: initialEntry,
  canReact,
  canModerate,
  badges,
}) => {
  const [entry, setEntry] = useState(initialEntry);
  const [removed, setRemoved] = useState(initialEntry.offFeed === "removed");
  const [takenBack, setTakenBack] = useState(false);
  const post = usePost(entry);
  const openPost = () => {
    post.openPost();
  };
  const subtitle = (
    <>
      Recognized by {entry.reviewer?.displayName ?? "a reviewer"} ·{" "}
      <time dateTime={entry.approvedAt}>{formatRelative(entry.approvedAt)}</time>
    </>
  );

  if (takenBack) {
    return (
      <Card>
        <CardContent className="text-sm text-muted-foreground">
          Took back {entry.points} points from {entry.user.displayName}&rsquo;s recognition.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", !post.comments.open && "pb-2", removed && "dark")}>
      {removed && (
        <p className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs font-semibold text-muted-foreground">
          <EyeOff className="size-3.5 shrink-0" aria-hidden />
          Removed from the feed. Only admins see it.
        </p>
      )}
      <PostHeader entry={entry} subtitle={subtitle}>
        {canModerate && (
          <RecognitionMenu
            editing={{
              id: entry.proofId,
              recipientName: entry.user.displayName,
              description: entry.recognitionDescription ?? "",
              descriptionMarkdown: entry.textMarkdown,
              points: entry.points,
              badgeLabels: (entry.badges ?? []).map(({ label }) => label),
              links: entry.achievementLinks ?? [],
            }}
            badges={badges}
            hidden={removed}
            onHiddenChange={setRemoved}
            onSaved={(saved) => {
              setEntry({
                ...entry,
                recognitionDescription: saved.description,
                textMarkdown: saved.descriptionMarkdown,
                achievementLinks: saved.links,
                badges: saved.badges,
              });
            }}
            onTakenBack={() => {
              setTakenBack(true);
            }}
          />
        )}
      </PostHeader>
      <div className="px-4">
        <button
          type="button"
          onClick={openPost}
          aria-haspopup="dialog"
          className="mb-2 flex items-center gap-2 text-sm font-bold text-brand-ink hover:underline"
        >
          <Award aria-hidden="true" className="size-4" /> Contribution recognized
        </button>
        <ClampedText
          text={entry.recognitionDescription ?? ""}
          markdown={entry.textMarkdown}
          onMore={openPost}
        />
        <RecognitionExtras entry={entry} />
      </div>
      <PostActions post={post} postId={entry.proofId} canReact={canReact} />
      <PostDialog
        entry={entry}
        post={post}
        canReact={canReact}
        title={`${entry.user.displayName} was recognized`}
        subtitle={subtitle}
      >
        <p className="flex items-center gap-2 text-sm font-bold text-brand-ink">
          <Award aria-hidden="true" className="size-4" /> Contribution recognized
        </p>
        <UserText
          text={entry.recognitionDescription ?? ""}
          markdown={entry.textMarkdown}
          className="text-xl leading-relaxed text-pretty sm:text-2xl"
        />
        <RecognitionExtras entry={entry} />
      </PostDialog>
    </Card>
  );
};

const RecognitionExtras: FC<{ entry: FeedEntryView }> = ({ entry }) => (
  <>
    {!!entry.badges?.length && (
      <ul aria-label="Earned badges" className="mt-3 flex list-none flex-wrap gap-2 p-0">
        {entry.badges.map((badge) => (
          <li key={badge.id}>
            <Badge variant="brand" className="gap-1.5">
              {badge.imageUrl && (
                <Image
                  src={badge.imageUrl}
                  alt=""
                  width={16}
                  height={16}
                  unoptimized
                  className="size-4 rounded-full object-cover"
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
  </>
);

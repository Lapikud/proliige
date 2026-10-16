"use client";

import { Award, ExternalLink } from "lucide-react";
import Image from "next/image";
import type { FC } from "react";
import { formatRelative } from "~/lib/utils";
import { UserText } from "../ui/markdown";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { ClampedText } from "./clampedText";
import type { FeedEntryView } from "./model";
import { PostActions } from "./postActions";
import { PostDialog } from "./postDialog";
import { PostHeader } from "./postHeader";
import { usePost } from "./usePost";

interface Props {
  entry: FeedEntryView;
  canReact: boolean;
}

export const RecognitionCard: FC<Props> = ({ entry, canReact }) => {
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

  return (
    <Card className={post.comments.open ? "overflow-hidden" : "overflow-hidden pb-2"}>
      <PostHeader entry={entry} subtitle={subtitle} />
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

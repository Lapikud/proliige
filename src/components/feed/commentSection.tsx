import { type FC } from "react";
import { Button } from "../ui/button";
import { ErrorState, Skeleton } from "../ui/feedback";
import { CommentForm } from "./commentForm";
import { CommentList } from "./commentList";
import { SignInPrompt } from "./signInPrompt";
import { type useFeedComments } from "./useFeedComments";

interface CommentSectionProps {
  proofId: string;
  canReact: boolean;
  section: ReturnType<typeof useFeedComments>;
}

export const CommentSection: FC<CommentSectionProps> = ({ proofId, canReact, section }) => {
  if (section.status === "loading") {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <span className="sr-only">Loading comments…</span>
        <Skeleton className="h-4 w-1/3 bg-foreground/15" />
        <Skeleton className="h-4 w-full bg-foreground/15" />
        <Skeleton className="h-4 w-2/3 bg-foreground/15" />
      </div>
    );
  }

  if (section.status === "error") {
    return (
      <ErrorState description="Could not load comments.">
        <Button size="sm" variant="outline" onClick={() => void section.retry()}>
          Try again
        </Button>
      </ErrorState>
    );
  }

  if (section.status !== "loaded") {
    return null;
  }

  return (
    <>
      <CommentList comments={section.comments} onDeleted={section.onDeleted} />
      {canReact ? <CommentForm proofId={proofId} onPosted={section.onPosted} /> : <SignInPrompt />}
    </>
  );
};

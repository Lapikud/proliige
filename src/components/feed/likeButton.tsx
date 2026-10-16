"use client";

import { Heart } from "lucide-react";
import { type FC, useState } from "react";
import { toggleLikeAction } from "~/actions/feed";
import { useAction } from "~/lib/form";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";

interface LikeState {
  liked: boolean;
  count: number;
}

const flip = ({ liked, count }: LikeState): LikeState => ({
  liked: !liked,
  count: count + (liked ? -1 : 1),
});

export function useLike(proofId: string, liked: boolean, count: number) {
  const [state, setState] = useState<LikeState>({
    liked,
    count,
  });
  const { run, pending } = useAction(toggleLikeAction, {
    onSuccess: (result) => {
      setState({
        liked: result.liked,
        count: result.likeCount,
      });
    },
    onError: () => {
      setState(flip);
    },
  });

  const toggle = () => {
    setState(flip);
    run({ proofId });
  };

  return {
    ...state,
    pending,
    toggle,
  };
}

interface Props {
  like: ReturnType<typeof useLike>;
  disabled: boolean;
}

export const LikeButton: FC<Props> = ({ like, disabled }) => (
  <Button
    variant="ghost"
    onClick={like.toggle}
    disabled={disabled || like.pending}
    aria-pressed={like.liked}
    aria-label={like.liked ? "Remove your like" : "Like this proof"}
  >
    <Heart
      aria-hidden="true"
      className={cn("size-5!", like.liked && "fill-primary text-primary")}
    />
    <span className="tabular-nums">{like.count}</span>
  </Button>
);

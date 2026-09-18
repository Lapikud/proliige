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

interface Props {
  proofId: string;
  liked: boolean;
  count: number;
  disabled: boolean;
}

export const LikeButton: FC<Props> = ({
  proofId,
  liked: initialLiked,
  count: initialCount,
  disabled,
}) => {
  const [state, setState] = useState<LikeState>({
    liked: initialLiked,
    count: initialCount,
  });
  const { run, pending } = useAction(toggleLikeAction, {
    onSuccess: ({ liked, likeCount }) => {
      setState({
        liked,
        count: likeCount,
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

  return (
    <Button
      variant="ghost"
      onClick={toggle}
      disabled={disabled || pending}
      aria-pressed={state.liked}
      aria-label={state.liked ? "Remove your like" : "Like this proof"}
    >
      <Heart
        aria-hidden="true"
        className={cn("size-5!", state.liked && "fill-primary text-primary")}
      />
      <span className="tabular-nums">{state.count}</span>
    </Button>
  );
};

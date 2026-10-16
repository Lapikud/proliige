import type { PostRef } from "~/domain/feed";

export interface LikeRepository {
  toggleLike(input: { post: PostRef; userId: string; now: Date }): Promise<{
    liked: boolean;
    likeCount: number;
  }>;
}

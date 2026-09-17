export interface LikeRepository {
  toggleLike(input: { proofId: string; userId: string; now: Date }): Promise<{
    liked: boolean;
    likeCount: number;
  }>;
}

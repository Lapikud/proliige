export interface AchievementLink {
  readonly title: string;
  readonly url: string;
}

export interface RecognitionBadge {
  readonly id: string;
  readonly label: string;
  readonly imageUrl: string | null;
}

export interface RecognitionInput {
  recipientId: string;
  description: string;
  descriptionMarkdown?: boolean;
  points: number;
  badgeIds: ReadonlyArray<string>;
  links: ReadonlyArray<AchievementLink>;
}

export type RecognitionEdit = Omit<RecognitionInput, "recipientId" | "points">;

export interface RecognitionRepository {
  listEligibleRecipients(): Promise<Array<{ id: string; displayName: string }>>;
  findById(id: string): Promise<{
    id: string;
    recipientId: string;
    hiddenAt: Date | null;
    revokedAt: Date | null;
  } | null>;
  listBadges(): Promise<Array<RecognitionBadge>>;
  listEarnedBadges(userId: string): Promise<Array<RecognitionBadge>>;
  createBadge(input: {
    label: string;
    imageUrl: string | null;
    createdBy: string;
    now: Date;
  }): Promise<RecognitionBadge>;
  publish(input: RecognitionInput & { reviewerId: string; now: Date }): Promise<void>;
  update(input: RecognitionEdit & { id: string }): Promise<void>;
  setHidden(input: { id: string; hidden: boolean; hiddenBy: string; now: Date }): Promise<void>;
  revoke(input: { id: string; revokedBy: string; now: Date }): Promise<{ alreadyRevoked: boolean }>;
}

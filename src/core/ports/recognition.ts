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

export interface RecognitionRepository {
  listEligibleRecipients(): Promise<Array<{ id: string; displayName: string }>>;
  findById(id: string): Promise<{ id: string; recipientId: string } | null>;
  listBadges(): Promise<Array<RecognitionBadge>>;
  listEarnedBadges(userId: string): Promise<Array<RecognitionBadge>>;
  createBadge(input: {
    label: string;
    imageUrl: string | null;
    createdBy: string;
    now: Date;
  }): Promise<RecognitionBadge>;
  publish(input: RecognitionInput & { reviewerId: string; now: Date }): Promise<void>;
}

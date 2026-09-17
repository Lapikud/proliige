import type { FeedCursor, FeedEntry, FeedPage } from "~/domain/feed";

export interface FeedRepository {
  listFeed(input: {
    cursor: FeedCursor | null;
    limit: number;
    categoryId?: string | null;
    authorId?: string | null;
    viewerId: string | null;
  }): Promise<
    Omit<FeedPage, "entries"> & {
      entries: ReadonlyArray<
        Omit<FeedEntry, "photoUrls"> & {
          photoIds: ReadonlyArray<string>;
        }
      >;
    }
  >;
}

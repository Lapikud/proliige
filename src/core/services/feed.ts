import { feedConfig } from "~/config/feed";
import type { FeedCursor, FeedPage } from "~/domain/feed";
import { userCanViewFeed } from "~/domain/rules";
import { guard } from "../guard";
import type { FeedRepository } from "../ports/feed";

interface Deps {
  readonly feed: FeedRepository;
}

interface ListFeedInput {
  readonly cursor: FeedCursor | null;
  readonly limit?: number | undefined;
  readonly categoryId?: string | null;
  readonly authorId?: string | null;
}

export function createFeedService({ feed }: Deps) {
  return {
    listFeed: guard(userCanViewFeed, async (user, input: ListFeedInput): Promise<FeedPage> => {
      const page = await feed.listFeed({
        cursor: input.cursor,
        limit: Math.min(input.limit ?? feedConfig.feedPageSize, feedConfig.feedMaxPageSize),
        categoryId: input.categoryId ?? null,
        authorId: input.authorId ?? null,
        viewerId: user?.id ?? null,
      });

      return {
        nextCursor: page.nextCursor,
        entries: page.entries.map(({ photoIds, ...entry }) => ({
          ...entry,
          photoUrls: photoIds.map((photoId) => `/api/photos/${entry.proofId}/${photoId}`),
        })),
      };
    }),
  };
}

export type FeedService = ReturnType<typeof createFeedService>;

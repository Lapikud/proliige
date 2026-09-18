import { toFeedEntryView } from "~/components/feed/model";
import { decodeFeedCursor, encodeFeedCursor } from "~/domain/feed";
import { feedService } from "~/infra";
import { route } from "~/lib/http";
import { getUser } from "~/lib/user";

export const GET = route(async (request) => {
  const { searchParams } = new URL(request.url);
  const page = await feedService.listFeed(await getUser(), {
    cursor: decodeFeedCursor(searchParams.get("cursor")),
    limit: Number(searchParams.get("limit")) || undefined,
    categoryId: searchParams.get("category"),
  });

  return Response.json({
    entries: page.entries.map(toFeedEntryView),
    nextCursor: page.nextCursor && encodeFeedCursor(page.nextCursor),
  });
});

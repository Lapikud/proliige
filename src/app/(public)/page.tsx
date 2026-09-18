import type { Metadata } from "next";
import type { FC } from "react";
import { FeedList } from "~/components/feed/list";
import { toCommentView, toFeedEntryView } from "~/components/feed/model";
import { CategoryFilter } from "~/components/feed/categoryFilter";
import { LeaderboardStories } from "~/components/leaderboard/stories";
import { LeaderboardPanel } from "~/components/leaderboard/panel";
import { leaderboardPeriod, PeriodToggle } from "~/components/leaderboard/periodToggle";
import { encodeFeedCursor } from "~/domain/feed";
import { userCanReactToProofs } from "~/domain/rules";
import { categoryService, commentService, feedService, leaderboardService } from "~/infra";
import { getUser } from "~/lib/user";
import { startOfMonthInTallinn } from "~/lib/utils";

export const metadata: Metadata = { title: "Feed" };

const HomePage: FC<PageProps<"/">> = async ({ searchParams }) => {
  const { category, period: periodParam } = await searchParams;
  const categoryId = typeof category === "string" ? category : null;
  const period = leaderboardPeriod(periodParam);
  const keepCategory = categoryId ? { category: categoryId } : undefined;
  const keepPeriod = period === "month" ? { period } : undefined;
  const user = await getUser();

  const [page, ranking, categories] = await Promise.all([
    feedService.listFeed(user, {
      cursor: null,
      categoryId,
    }),
    leaderboardService.listLeaderboard(user, {
      limit: 50,
      since: period === "month" ? startOfMonthInTallinn() : null,
    }),
    categoryService.listFeedCategories(user),
  ]);
  const comments = await Promise.all(
    page.entries.map(
      async ({ proofId }) =>
        [
          proofId,
          (await commentService.listComments(user, proofId)).map((comment) =>
            toCommentView(comment, user),
          ),
        ] as const,
    ),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
      <h1 className="sr-only">Feed and leaderboard</h1>

      <aside aria-label="Leaderboard" className="hidden lg:col-span-4 lg:block">
        <div className="sticky top-6">
          <LeaderboardPanel
            rows={ranking.slice(0, 15)}
            currentUserId={user?.id ?? null}
            period={period}
            {...(keepCategory ? { keep: keepCategory } : {})}
          />
        </div>
      </aside>

      <section
        aria-label="Feed"
        className="mx-auto flex w-full max-w-xl flex-col gap-5 lg:col-span-8"
      >
        <div className="flex flex-col gap-3 lg:hidden">
          <PeriodToggle current={period} {...(keepCategory ? { keep: keepCategory } : {})} />
          <LeaderboardStories rows={ranking} />
        </div>
        <CategoryFilter
          categories={categories}
          current={categoryId}
          {...(keepPeriod ? { keep: keepPeriod } : {})}
        />
        <FeedList
          key={categoryId ?? "all"}
          initialEntries={page.entries.map(toFeedEntryView)}
          initialCursor={page.nextCursor && encodeFeedCursor(page.nextCursor)}
          commentsByProof={Object.fromEntries(comments)}
          canReact={userCanReactToProofs(user)}
          categoryId={categoryId}
          categoryName={categories.find((category) => category.id === categoryId)?.name ?? null}
        />
      </section>
    </div>
  );
};

export default HomePage;

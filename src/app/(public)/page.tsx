import type { Metadata } from "next";
import type { FC } from "react";
import { CategoryFilter } from "~/components/feed/categoryFilter";
import { FeedList } from "~/components/feed/list";
import { toFeedEntryView } from "~/components/feed/model";
import { LeaderboardPanel } from "~/components/leaderboard/panel";
import { leaderboardPeriod } from "~/components/leaderboard/periodToggle";
import { LeaderboardStories } from "~/components/leaderboard/stories";
import { encodeFeedCursor, recognitionFilter } from "~/domain/feed";
import { userCanReactToProofs } from "~/domain/rules";
import { categoryService, feedService, leaderboardService } from "~/infra";
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
      limit: 10,
      since: period === "month" ? startOfMonthInTallinn() : null,
    }),
    categoryService.listFeedCategories(user),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
      <h1 className="sr-only">Feed and leaderboard</h1>

      <aside aria-label="Leaderboard" className="hidden lg:col-span-4 lg:block">
        <div className="sticky top-[calc(var(--nav-h)+1.5rem)]">
          <LeaderboardPanel
            rows={ranking}
            currentUserId={user?.id ?? null}
            period={period}
            {...(keepCategory ? { keep: keepCategory } : {})}
          />
        </div>
      </aside>

      <section
        aria-label="Feed"
        className="mx-auto flex w-full max-w-xl min-w-0 flex-col gap-2 lg:col-span-8 lg:gap-5"
      >
        <div className="lg:hidden">
          <LeaderboardStories
            rows={ranking}
            period={period}
            {...(keepCategory ? { keep: keepCategory } : {})}
          />
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
          canReact={userCanReactToProofs(user)}
          categoryId={categoryId}
          categoryName={
            categoryId === recognitionFilter
              ? "Recognitions"
              : (categories.find((category) => category.id === categoryId)?.name ?? null)
          }
        />
      </section>
    </div>
  );
};

export default HomePage;

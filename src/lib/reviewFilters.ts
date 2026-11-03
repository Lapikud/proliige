import { z } from "zod";
import type { ProofFilters } from "~/domain/proof";
import { taskPolicies } from "~/domain/task";

const reviewQuerySchema = z.object({
  category: z.uuid().optional().catch(undefined),
  policy: z.enum(taskPolicies).optional().catch(undefined),
  origin: z.enum(["catalog", "own"]).optional().catch(undefined),
  view: z.enum(["requested", "all", "reported"]).optional().catch(undefined),
});

export type ReviewView = z.output<typeof reviewQuerySchema>["view"];

export function readReviewQuery(params: Record<string, string | Array<string> | undefined>): {
  filters: ProofFilters;
  view: ReviewView;
} {
  const query = reviewQuerySchema.parse(params);

  return {
    filters: {
      categoryId: query.category,
      policy: query.policy,
      ownTask: query.origin === undefined ? undefined : query.origin === "own",
    },
    view: query.view,
  };
}

export function reviewHref(filters: ProofFilters, view?: ReviewView): string {
  const params = new URLSearchParams();
  if (view !== undefined) params.set("view", view);
  if (filters.categoryId !== undefined) params.set("category", filters.categoryId);
  if (filters.policy !== undefined) params.set("policy", filters.policy);
  if (filters.ownTask !== undefined) params.set("origin", filters.ownTask ? "own" : "catalog");

  const query = params.toString();

  return query ? `/admin/review?${query}` : "/admin/review";
}

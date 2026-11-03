import { ChevronDown } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import type { ComponentProps } from "react";
import type { ProofFilters } from "~/domain/proof";
import { taskPolicies, type Category } from "~/domain/task";
import { reviewHref, type ReviewView } from "~/lib/reviewFilters";
import { describeTaskPolicy } from "~/lib/taskLabels";
import { cn } from "~/lib/utils";
import { Button, buttonVariants } from "../ui/button";
import { Label, Select } from "../ui/formControls";
import { PopoverClose } from "../ui/popover";

interface Props {
  categories: ReadonlyArray<Category>;
  filters: ProofFilters;
  view: Exclude<ReviewView, undefined>;
}

export function ReviewFilters({ categories, filters, view }: Readonly<Props>) {
  const origin = filters.ownTask ? "own" : "catalog";
  const unknownCategory =
    filters.categoryId !== undefined &&
    !categories.some((category) => category.id === filters.categoryId);

  return (
    <Form action="/admin/review" scroll={false}>
      <fieldset key={reviewHref(filters, view)} className="flex min-w-0 flex-col gap-4">
        <legend className="mb-4 text-base font-bold">Review filters</legend>
        <input type="hidden" name="view" value={view} />
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="review-category">Category</Label>
          <FilterSelect
            id="review-category"
            name="category"
            defaultValue={filters.categoryId ?? ""}
          >
            <option value="">All categories</option>
            {unknownCategory && <option value={filters.categoryId}>Unavailable category</option>}
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </FilterSelect>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="review-policy">Completion rule</Label>
          <FilterSelect id="review-policy" name="policy" defaultValue={filters.policy ?? ""}>
            <option value="">All rules</option>
            {taskPolicies.map((policy) => (
              <option key={policy} value={policy}>
                {describeTaskPolicy(policy)}
              </option>
            ))}
          </FilterSelect>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="review-origin">Task origin</Label>
          <FilterSelect
            id="review-origin"
            name="origin"
            defaultValue={filters.ownTask === undefined ? "" : origin}
          >
            <option value="">All tasks</option>
            <option value="catalog">Task list</option>
            <option value="own">Member-created</option>
          </FilterSelect>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <PopoverClose asChild>
            <Link
              href={reviewHref({}, view)}
              scroll={false}
              className={buttonVariants({ variant: "ghost" })}
            >
              Reset
            </Link>
          </PopoverClose>
          <Button type="submit" className="cursor-pointer">
            Apply
          </Button>
        </div>
      </fieldset>
    </Form>
  );
}

function FilterSelect({ className, ...props }: ComponentProps<typeof Select>) {
  return (
    <div className="relative">
      <Select {...props} className={cn("appearance-none pr-10", className)} />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

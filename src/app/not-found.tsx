import Link from "next/link";
import type { FC } from "react";
import { Button } from "~/components/ui/button";
import { StatusPage } from "~/components/ui/feedback";

const NotFound: FC = () => (
  <StatusPage
    code="404"
    title="Not found"
    description="That page or item does not exist, or it has been removed."
  >
    <Button asChild variant="outline">
      <Link href="/">Back to the leaderboard</Link>
    </Button>
  </StatusPage>
);

export default NotFound;

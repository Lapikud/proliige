import Link from "next/link";
import type { FC } from "react";
import { Button } from "~/components/ui/button";
import { StatusPage } from "~/components/ui/feedback";

const Forbidden: FC = () => (
  <StatusPage
    code="403"
    title="No access"
    description="Your account is not in a group that can open this page. Ask the board if you think it should be."
  >
    <Button asChild variant="outline">
      <Link href="/">Back to the leaderboard</Link>
    </Button>
  </StatusPage>
);

export default Forbidden;

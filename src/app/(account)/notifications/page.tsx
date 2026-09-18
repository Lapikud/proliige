import type { Metadata } from "next";
import type { FC } from "react";
import { DesktopNotifications } from "~/components/notifications/desktop";
import { MarkAllReadButton } from "~/components/notifications/markAllReadButton";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/feedback";
import { Page } from "~/components/ui/page";
import { env } from "~/env.config";
import { notificationService } from "~/infra";
import { cn, formatDateTime } from "~/lib/utils";
import { userCanReadNotifications, userCanReviewProofs, userCanSubmitProof } from "~/domain/rules";
import type { User } from "~/domain/user";
import { requireUser } from "~/lib/user";

export const metadata: Metadata = { title: "Notifications" };

const NotificationsPage: FC = async () => {
  const user = await requireUser(userCanReadNotifications);
  const items = await notificationService.listNotifications(user);
  const unread = items.filter((item) => item.readAt === null).length;

  return (
    <Page
      title="Notifications"
      description={unread === 0 ? "You are all caught up." : `${unread} unread.`}
      actions={unread > 0 && <MarkAllReadButton />}
    >
      <DesktopNotifications vapidPublicKey={env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
      {items.length === 0 && <EmptyState title="Nothing yet" description={whatYouWillHear(user)} />}
      <ul className="flex list-none flex-col gap-2 p-0">
        {items.map((item) => (
          <li key={item.id}>
            <Card className={cn(item.readAt === null && "border-foreground")}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="flex flex-col gap-1">
                  <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                    {item.title}
                    {item.readAt === null && <Badge variant="brand">New</Badge>}
                  </p>
                  <p className="text-sm text-muted-foreground">{item.message}</p>
                </div>
                <time
                  dateTime={item.createdAt.toISOString()}
                  className="text-xs text-muted-foreground"
                >
                  {formatDateTime(item.createdAt)}
                </time>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </Page>
  );
};

function whatYouWillHear(user: User): string {
  if (userCanReviewProofs(user)) {
    return "You will be notified when someone asks you to review a proof.";
  }
  if (userCanSubmitProof(user)) {
    return "You will be notified when your proofs are approved or rejected, and when someone comments on them.";
  }

  return "You will be notified when someone replies in a thread you commented on.";
}

export default NotificationsPage;

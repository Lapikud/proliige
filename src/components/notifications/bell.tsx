import type { FC } from "react";
import type { User } from "~/domain/user";
import { notificationService } from "~/infra";
import { LiveBell } from "./liveBell";

interface Props {
  user: User;
}

export const NotificationBell: FC<Props> = async ({ user }) => (
  <LiveBell unread={await notificationService.countUnreadNotifications(user)} />
);

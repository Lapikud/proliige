"use server";

import { notificationService } from "~/infra";
import { action } from "~/lib/action";
import { markAllReadSchema, pushEndpointSchema, pushSubscriptionSchema } from "./schema";

export const markAllReadAction = action(
  markAllReadSchema,
  async (user) => {
    await notificationService.markAllNotificationsRead(user);
  },
  { revalidate: ["/notifications"] },
);

export const savePushSubscriptionAction = action(
  pushSubscriptionSchema,
  async (user, subscription) => {
    await notificationService.savePushSubscription(user, subscription);
  },
);

export const removePushSubscriptionAction = action(
  pushEndpointSchema,
  async (user, { endpoint }) => {
    await notificationService.removePushSubscription(user, endpoint);
  },
);

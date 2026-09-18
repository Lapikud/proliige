import { z } from "zod";

export const markAllReadSchema = z.object({});

export const pushSubscriptionSchema = z.object({
  endpoint: z.url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

export const pushEndpointSchema = z.object({ endpoint: z.url().max(2048) });

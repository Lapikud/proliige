"use server";

import { recognitionService } from "~/infra";
import { action } from "~/lib/action";
import { createRecognitionBadgeSchema, publishRecognitionSchema } from "./schema";

export const createRecognitionBadgeAction = action(
  createRecognitionBadgeSchema,
  (user, input) => recognitionService.createBadge(user, input),
  { revalidate: ["/admin/tasks"] },
);

export const publishRecognitionAction = action(
  publishRecognitionSchema,
  async (user, input) => recognitionService.publish(user, input),
  { revalidate: ["/", "/admin/tasks", "/users"] },
);

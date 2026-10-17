"use server";

import { recognitionService } from "~/infra";
import { action } from "~/lib/action";
import {
  createRecognitionBadgeSchema,
  publishRecognitionSchema,
  setRecognitionHiddenSchema,
  takeBackRecognitionSchema,
  updateRecognitionSchema,
} from "./schema";

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

const moderated = ["/", "/api/feed", "/api/leaderboard", "/users"];

export const updateRecognitionAction = action(
  updateRecognitionSchema,
  async (user, { id, ...input }) => recognitionService.update(user, id, input),
  { revalidate: moderated },
);

export const setRecognitionHiddenAction = action(
  setRecognitionHiddenSchema,
  async (user, { id, hidden }) => recognitionService.setHidden(user, id, hidden),
  { revalidate: moderated },
);

export const takeBackRecognitionAction = action(
  takeBackRecognitionSchema,
  async (user, { id }) => {
    await recognitionService.takeBack(user, id);
  },
  { revalidate: moderated },
);

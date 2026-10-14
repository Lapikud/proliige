import { z } from "zod";

export const setUserExcludedSchema = z.object({
  userId: z.uuid(),
  excluded: z.boolean(),
});

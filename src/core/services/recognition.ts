import { userCanReviewProofs, userCanViewFeed } from "~/domain/rules";
import { conflict, validation } from "~/domain/errors";
import { guard } from "../guard";
import type { ClockPort } from "../ports/clock";
import type { RecognitionInput, RecognitionRepository } from "../ports/recognition";

export function createRecognitionService({
  recognitions,
  clock,
}: {
  recognitions: RecognitionRepository;
  clock: ClockPort;
}) {
  return {
    listEligibleRecipients: guard(userCanReviewProofs, () => recognitions.listEligibleRecipients()),
    listBadges: guard(userCanReviewProofs, () => recognitions.listBadges()),
    listEarnedBadges: guard(userCanViewFeed, (_viewer, userId: string) =>
      recognitions.listEarnedBadges(userId),
    ),
    createBadge: guard(
      userCanReviewProofs,
      async (reviewer, input: { label: string; imageUrl: string | null }) => {
        const label = input.label.trim();
        if (!label || label.length > 60) throw validation("Badge names must be 1–60 characters.");
        if (input.imageUrl !== null) {
          let image: URL;
          try {
            image = new URL(input.imageUrl);
          } catch {
            throw validation("Badge images must use a valid http or https URL.");
          }
          if (image.protocol !== "https:" && image.protocol !== "http:") {
            throw validation("Badge images must use a valid http or https URL.");
          }
        }

        return recognitions.createBadge({
          label,
          imageUrl: input.imageUrl,
          createdBy: reviewer.id,
          now: clock.now(),
        });
      },
    ),
    publish: guard(userCanReviewProofs, async (reviewer, input: RecognitionInput) => {
      if (input.recipientId === reviewer.id) {
        throw validation("You cannot recognize yourself.");
      }
      if (!Number.isSafeInteger(input.points) || input.points <= 0) {
        throw validation("Points must be a positive whole number.");
      }
      if (!input.description.trim()) {
        throw validation("Describe the contribution before publishing.");
      }
      if (new Set(input.badgeIds).size !== input.badgeIds.length) {
        throw validation("Choose each badge only once.");
      }
      for (const link of input.links) {
        let url: URL;
        try {
          url = new URL(link.url);
        } catch {
          throw validation("Achievement links must be valid http or https URLs.");
        }
        if ((url.protocol !== "http:" && url.protocol !== "https:") || !link.title.trim()) {
          throw validation("Achievement links need a title and a safe http or https URL.");
        }
      }
      const recipients = await recognitions.listEligibleRecipients();
      if (!recipients.some(({ id }) => id === input.recipientId)) {
        throw conflict("That member is not eligible to receive recognition.");
      }
      await recognitions.publish({
        ...input,
        reviewerId: reviewer.id,
        now: clock.now(),
      });
    }),
  };
}

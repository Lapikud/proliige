import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ProofWithContext } from "~/core/ports/proof";
import { HistoryRow } from "~/components/review/historyRow";

const entry: ProofWithContext = {
  proof: {
    id: "proof-1",
    taskId: "task-1",
    userId: "member-1",
    status: "approved",
    textAnswer: "I organized the community meetup.",
    rejectionReason: null,
    submittedAt: new Date("2026-10-15T10:00:00Z"),
    reviewedAt: new Date("2026-10-15T12:00:00Z"),
    reviewedBy: "reviewer-1",
  },
  taskTitle: "Organize a meetup",
  proofPolicy: "one_per_user",
  taskDescription: "",
  ownTask: false,
  taskPoints: 10,
  taskRemoved: false,
  taskRemovedAt: null,
  taskRemovedByName: null,
  pointsReversed: false,
  pointsAwardedAt: new Date("2026-10-15T12:00:00Z"),
  pointsReversedAt: null,
  categoryName: "Culture",
  userDisplayName: "Alex Member",
  photos: [
    {
      id: "photo-1",
      proofId: "proof-1",
      objectKey: "proofs/member-1/photo.jpg",
      contentType: "image/jpeg",
      sizeBytes: 1024,
      uploadedAt: new Date("2026-10-15T10:00:00Z"),
    },
  ],
  requestedReviewers: [],
  reviewedByName: "Sam Reviewer",
};

describe("review history proof details", () => {
  it("preserves the main history card layout and makes it a dialog trigger", () => {
    const html = renderToStaticMarkup(createElement(HistoryRow, { entry }));

    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain("whitespace-normal");
    expect(html).toContain("Alex Member</span> · Organize a meetup");
    expect(html).toContain("Approved");
    expect(html).not.toContain("I organized the community meetup.");
    expect(html).not.toContain("/api/photos/proof-1/photo-1");
  });

  it("renders safely when the proof has no text or photos", () => {
    const html = renderToStaticMarkup(
      createElement(HistoryRow, {
        entry: {
          ...entry,
          proof: {
            ...entry.proof,
            textAnswer: null,
          },
          photos: [],
        },
      }),
    );

    expect(html).toContain("Organize a meetup");
    expect(html).not.toContain("/api/photos/");
  });
});

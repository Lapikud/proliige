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
  taskDescription: "",
  ownTask: false,
  taskPoints: 10,
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
  it("shows the submitted answer and photo alongside submitter and reviewer", () => {
    const html = renderToStaticMarkup(createElement(HistoryRow, { entry }));

    expect(html).toContain("I organized the community meetup.");
    expect(html).toContain("/api/photos/proof-1/photo-1");
    expect(html).toContain("Alex Member");
    expect(html).toContain("reviewed by Sam Reviewer");
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

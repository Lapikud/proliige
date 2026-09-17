import { and, eq, inArray } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { predicate } from "../predicate";
import { users } from "../user/model";
import { taskPolicyEnum, tasks } from "../task/model";

export const proofStatusEnum = pgEnum("proof_status", ["pending", "approved", "rejected"]);

export const proofs = pgTable(
  "proofs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    policy: taskPolicyEnum("policy").notNull(),
    status: proofStatusEnum("status").notNull().default("pending"),
    rejectionReason: text("rejection_reason"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    uniqueIndex("proofs_one_pending_per_user")
      .on(t.taskId, t.userId)
      .where(predicate(eq(t.status, "pending"))),

    uniqueIndex("proofs_single_winner_exclusive")
      .on(t.taskId)
      .where(
        predicate(and(eq(t.policy, "single_winner"), inArray(t.status, ["pending", "approved"]))),
      ),

    uniqueIndex("proofs_one_approved_per_user")
      .on(t.taskId, t.userId)
      .where(predicate(and(eq(t.policy, "one_per_user"), eq(t.status, "approved")))),

    index("proofs_status_idx").on(t.status),
    index("proofs_user_idx").on(t.userId),
    index("proofs_task_user_status_idx").on(t.taskId, t.userId, t.status),

    index("proofs_feed_idx")
      .on(t.reviewedAt.desc(), t.id.desc())
      .where(predicate(eq(t.status, "approved"))),
  ],
);

export const proofPhotos = pgTable(
  "proof_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    proofId: uuid("proof_id")
      .notNull()
      .references(() => proofs.id, { onDelete: "cascade" }),

    objectKey: text("object_key").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("proof_photos_object_key_key").on(t.objectKey),
    index("proof_photos_proof_idx").on(t.proofId),
  ],
);

export const proofReviewRequests = pgTable(
  "proof_review_requests",
  {
    proofId: uuid("proof_id")
      .notNull()
      .references(() => proofs.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.proofId, t.reviewerId] }),
    index("proof_review_requests_reviewer_idx").on(t.reviewerId),
  ],
);

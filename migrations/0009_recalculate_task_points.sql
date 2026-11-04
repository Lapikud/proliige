LOCK TABLE "tasks", "proofs", "points_ledger" IN SHARE ROW EXCLUSIVE MODE;--> statement-breakpoint

UPDATE "points_ledger" AS credit
SET "points" = task."points"
FROM "proofs" AS proof
JOIN "tasks" AS task ON task."id" = proof."task_id"
WHERE credit."proof_id" = proof."id"
  AND credit."reversal_of" IS NULL
  AND proof."status" = 'approved'
  AND NOT EXISTS (
    SELECT 1
    FROM "points_ledger" AS reversal
    WHERE reversal."reversal_of" = credit."id"
  )
  AND credit."points" IS DISTINCT FROM task."points";

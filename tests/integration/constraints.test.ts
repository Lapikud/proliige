import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TaskPolicy } from "~/domain/task";
import { categories } from "~/infra/db/category/model";
import { users } from "~/infra/db/user/model";
import { pointsLedger } from "~/infra/db/points/model";
import { proofs } from "~/infra/db/proof/model";
import { tasks } from "~/infra/db/task/model";
import { connect, truncateAll } from "./helpers";
import { first, firstTwo } from "../support";

const { client, db } = connect();

afterAll(async () => {
  await client.end();
});

beforeEach(async () => {
  await truncateAll(db);
});

async function seed(policy: TaskPolicy) {
  const category = first(
    await db
      .insert(categories)
      .values({
        name: "General",
        slug: "general",
      })
      .returning(),
  );
  const task = first(
    await db
      .insert(tasks)
      .values({
        title: "Task",
        categoryId: category.id,
        points: 5,
        policy,
      })
      .returning(),
  );
  const [alice, bob] = firstTwo(
    await db
      .insert(users)
      .values([
        {
          ipaUniqueId: "ipa-alice",
          uid: "alice",
          displayName: "Alice",
        },
        {
          ipaUniqueId: "ipa-bob",
          uid: "bob",
          displayName: "Bob",
        },
      ])
      .returning(),
  );

  return {
    task,
    alice,
    bob,
  };
}

type ProofRow = typeof proofs.$inferInsert;

const insertProof = (row: ProofRow) => db.insert(proofs).values(row).returning();

describe("pending proofs", () => {
  it("refuses a second pending proof by the same user on a task-wide scope", async () => {
    const { task, alice } = await seed("one_per_user");
    const row = {
      taskId: task.id,
      userId: alice.id,
      policy: task.policy,
      status: "pending" as const,
    };

    await insertProof(row);
    await expect(insertProof(row)).rejects.toThrow();
  });

  it("allows pending proofs by different users", async () => {
    const { task, alice, bob } = await seed("one_per_user");
    const row = {
      taskId: task.id,
      policy: task.policy,
      status: "pending" as const,
    };

    await insertProof({
      ...row,
      userId: alice.id,
    });
    await expect(
      insertProof({
        ...row,
        userId: bob.id,
      }),
    ).resolves.toHaveLength(1);
  });
});

describe("completion policies", () => {
  it("single_winner: refuses anyone else while a proof is pending", async () => {
    const { task, alice, bob } = await seed("single_winner");
    const row = {
      taskId: task.id,
      policy: task.policy,
      status: "pending" as const,
    };

    await insertProof({
      ...row,
      userId: alice.id,
    });
    await expect(
      insertProof({
        ...row,
        userId: bob.id,
      }),
    ).rejects.toThrow();
  });

  it("single_winner: frees the task once the pending proof is rejected", async () => {
    const { task, alice, bob } = await seed("single_winner");
    const row = {
      taskId: task.id,
      policy: task.policy,
    };

    await insertProof({
      ...row,
      userId: alice.id,
      status: "rejected",
    });
    await expect(
      insertProof({
        ...row,
        userId: bob.id,
        status: "pending",
      }),
    ).resolves.toHaveLength(1);
  });

  it("one_per_user: refuses a second approved proof", async () => {
    const { task, alice } = await seed("one_per_user");
    const row = {
      taskId: task.id,
      userId: alice.id,
      policy: task.policy,
      status: "approved" as const,
    };

    await insertProof(row);
    await expect(insertProof(row)).rejects.toThrow();
  });

  it("repeatable: allows repeated approved proofs", async () => {
    const { task, alice } = await seed("repeatable");
    const row = {
      taskId: task.id,
      userId: alice.id,
      policy: task.policy,
      status: "approved" as const,
    };

    await insertProof(row);
    await expect(insertProof(row)).resolves.toHaveLength(1);
  });
});

describe("points", () => {
  it("refuses a second award for the same proof", async () => {
    const { task, alice } = await seed("one_per_user");
    const proof = first(
      await insertProof({
        taskId: task.id,
        userId: alice.id,
        policy: task.policy,
        status: "approved",
      }),
    );
    const award = {
      userId: alice.id,
      proofId: proof.id,
      points: 5,
    };

    await db.insert(pointsLedger).values(award);
    await expect(db.insert(pointsLedger).values(award)).rejects.toThrow();
  });
});

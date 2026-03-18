import { DrizzleEnvironmentContext } from "@siu-issiki/vitest-drizzle-mysql";
import { users } from "./schema.js";

describe("transaction rollback", () => {
  test("inserts a user within transaction", async () => {
    await vDrizzle.client.insert(users).values({ name: "Alice" });
    const result = await vDrizzle.client.select().from(users);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });

  test("previous test data is rolled back", async () => {
    const result = await vDrizzle.client.select().from(users);
    expect(result).toHaveLength(0);
  });

  test("inserts multiple users within transaction", async () => {
    await vDrizzle.client.insert(users).values([
      { name: "Bob" },
      { name: "Charlie" },
    ]);
    const result = await vDrizzle.client.select().from(users);
    expect(result).toHaveLength(2);
  });

  test("previous multi-insert is also rolled back", async () => {
    const result = await vDrizzle.client.select().from(users);
    expect(result).toHaveLength(0);
  });
});

describe("vDrizzle.client type safety", () => {
  test("client is available and typed inside test", async () => {
    const result = await vDrizzle.client.select().from(users);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("error handling", () => {
  test("setup failure propagates from beginTransaction", async () => {
    const context = new DrizzleEnvironmentContext({
      client: () => ({
        transaction: async (cb: (tx: unknown) => Promise<unknown>) => {
          return cb({});
        },
      }),
      setup: () => {
        throw new Error("setup failed");
      },
    });
    await context.setup();
    await expect(context.beginTransaction()).rejects.toThrow("setup failed");
  });

  test("teardown failure is thrown after rollback", async () => {
    const context = new DrizzleEnvironmentContext({
      client: () => ({
        transaction: async (cb: (tx: unknown) => Promise<unknown>) => {
          return cb({}).catch(() => {});
        },
      }),
      teardown: () => {
        throw new Error("teardown failed");
      },
    });
    await context.setup();
    await context.beginTransaction();
    await expect(context.rollbackTransaction()).rejects.toThrow(
      "teardown failed",
    );
  });

  test("beginTransaction throws if db is not initialized", async () => {
    const context = new DrizzleEnvironmentContext({
      client: () => ({
        transaction: async () => {},
      }),
    });
    // Don't call setup() — db is null
    await expect(context.beginTransaction()).rejects.toThrow(
      "Database client is not initialized",
    );
  });

  test("rollback failure is propagated instead of swallowed", async () => {
    const context = new DrizzleEnvironmentContext({
      client: () => ({
        transaction: async (cb: (tx: unknown) => Promise<unknown>) => {
          // Simulate: execute callback, then fail on rollback
          const result = cb({});
          // When the inner promise rejects (RollbackError), the transaction
          // implementation would attempt ROLLBACK. Simulate that failing:
          return result.catch(() => {
            throw new Error("rollback failed");
          });
        },
      }),
    });
    await context.setup();
    await context.beginTransaction();
    await expect(context.rollbackTransaction()).rejects.toThrow(
      "rollback failed",
    );
  });
});

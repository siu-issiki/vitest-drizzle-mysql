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
    // This verifies client is not just defined but actually usable as a transaction
    const result = await vDrizzle.client.select().from(users);
    expect(Array.isArray(result)).toBe(true);
  });
});

import { users } from "./schema.js";

describe("vitest-drizzle-mysql", () => {
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

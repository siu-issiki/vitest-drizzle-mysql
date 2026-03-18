import { beforeEach, afterEach, afterAll } from "vitest";
import { DrizzleEnvironmentContext } from "./context.js";
import {
  DrizzleEnvironmentOptions,
  TransactionCapableClient,
  VitestDrizzleContext,
} from "./types.js";

declare global {
  /**
   * Global variable providing the current test transaction.
   *
   * To get proper types, add a declaration file in your test project:
   * ```ts
   * // vitest-drizzle.d.ts
   * import type { MySql2Database } from "drizzle-orm/mysql2";
   * declare global {
   *   var vDrizzle: import("@siu-issiki/vitest-drizzle-mysql").VitestDrizzleContext<
   *     Parameters<Parameters<MySql2Database["transaction"]>[0]>[0]
   *   >;
   * }
   * ```
   */
  // eslint-disable-next-line no-var
  var vDrizzle: VitestDrizzleContext;
}

/**
 * Set up the Drizzle test environment for MySQL
 *
 * Call this function within a describe block, at the top level of a test file,
 * or in a Vitest setup file (specified in vitest.config.ts setupFiles).
 * Each test case will automatically run within a transaction that
 * rolls back when the test ends.
 *
 * @example
 * ```ts
 * // setup.ts (specified in vitest.config.ts setupFiles)
 * import { setupDrizzleEnvironment } from "@siu-issiki/vitest-drizzle-mysql";
 * import { db } from "./db";
 *
 * setupDrizzleEnvironment({
 *   client: () => db,
 * });
 * ```
 *
 * @example
 * ```ts
 * // Test file
 * test("creates a user", async () => {
 *   await vDrizzle.client.insert(users).values({ name: "test" });
 *   const result = await vDrizzle.client.select().from(users);
 *   expect(result).toHaveLength(1);
 * }); // Automatically rolls back when test ends
 * ```
 */
export function setupDrizzleEnvironment<
  TDatabase extends TransactionCapableClient<TTransaction>,
  TTransaction,
>(options: DrizzleEnvironmentOptions<TDatabase, TTransaction>): void {
  const context = new DrizzleEnvironmentContext<TDatabase, TTransaction>(
    options,
  );

  const vDrizzleProxy: VitestDrizzleContext<TTransaction> = {
    get client(): TTransaction {
      const tx = context.getCurrentTransaction();
      if (!tx) {
        throw new Error(
          "vDrizzle.client is not available outside of a test case. " +
            "Use it inside test() or beforeEach() functions.",
        );
      }
      return tx;
    },
  };

  globalThis.vDrizzle = vDrizzleProxy as VitestDrizzleContext;

  beforeEach(async () => {
    if (!context.getDatabase()) {
      await context.setup();
    }
    await context.beginTransaction();
  });

  afterEach(async () => {
    await context.rollbackTransaction();
  });

  afterAll(async () => {
    await context.teardown();
  });
}

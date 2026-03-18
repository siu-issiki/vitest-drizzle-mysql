import type { MySql2Database } from "drizzle-orm/mysql2";
import type { VitestDrizzleContext } from "@siu-issiki/vitest-drizzle-mysql";

declare global {
  var vDrizzle: VitestDrizzleContext<
    Parameters<Parameters<MySql2Database["transaction"]>[0]>[0]
  >;
}

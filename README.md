# @siu-issiki/vitest-drizzle-mysql

Vitest environment for Drizzle ORM with MySQL — automatic transaction rollback per test case.

MySQL version of [@siu-issiki/vitest-drizzle-pg](https://github.com/siu-issiki/vitest-drizzle-pg).

## Features

- Automatic transaction rollback per test case
- Zero cleanup code needed
- Works with Drizzle ORM + mysql2
- Type-safe with TypeScript
- Fast — rollback is cheaper than truncate

## Install

```bash
npm install -D @siu-issiki/vitest-drizzle-mysql
```

## Setup

### 1. Create a setup file

```ts
// test/setup.ts
import { setupDrizzleEnvironment } from "@siu-issiki/vitest-drizzle-mysql";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password",
  database: "test_db",
});

const db = drizzle(connection);

setupDrizzleEnvironment({
  client: () => db,
  disconnect: () => connection.end(),
});
```

### 2. Configure vitest

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./test/setup.ts"],
  },
});
```

### 3. Write tests

```ts
import { users } from "./schema";

test("creates a user", async () => {
  await vDrizzle.client.insert(users).values({ name: "test" });
  const result = await vDrizzle.client.select().from(users);
  expect(result).toHaveLength(1);
}); // Automatically rolls back — no cleanup needed

test("database is clean", async () => {
  const result = await vDrizzle.client.select().from(users);
  expect(result).toHaveLength(0); // Previous test's data is gone
});
```

## API

### `setupDrizzleEnvironment(options)`

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `client` | `() => TDatabase \| Promise<TDatabase>` | Yes | Function that returns the Drizzle instance |
| `setup` | `(tx) => void \| Promise<void>` | No | Runs before each test (inside transaction) |
| `teardown` | `(tx) => void \| Promise<void>` | No | Runs after each test (before rollback) |
| `disconnect` | `() => void \| Promise<void>` | No | Cleanup function when test suite ends |

### `vDrizzle.client`

Global variable available in all test files. Returns the current transaction client. Use it instead of your normal `db` instance.

By default, `vDrizzle.client` is typed as `unknown`. To get proper types, add a declaration file to your test project:

```ts
// vitest-drizzle.d.ts
import type { MySql2Database } from "drizzle-orm/mysql2";
import type { VitestDrizzleContext } from "@siu-issiki/vitest-drizzle-mysql";

declare global {
  var vDrizzle: VitestDrizzleContext<
    Parameters<Parameters<MySql2Database["transaction"]>[0]>[0]
  >;
}
```

## How it works

Uses a "Promise pending" pattern (inspired by [jest-prisma](https://github.com/paladinoli/jest-prisma)):

1. `db.transaction()` starts before each test
2. A Promise is created inside the transaction callback, and the `reject` function is held
3. The transaction client is exposed as `vDrizzle.client`
4. When the test ends, `reject()` is called, triggering a rollback
5. The error is caught silently

This approach works because MySQL's InnoDB engine supports transactions with rollback.

## Limitations

### Parallel test execution

This library uses a single transaction slot per setup, so it does **not** support `test.concurrent` or parallel test files sharing the same setup. Configure Vitest to run tests sequentially:

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
```

### MySQL-specific caveats

- **DDL statements** (`CREATE TABLE`, `ALTER TABLE`, etc.) cause an implicit commit in MySQL and cannot be rolled back. Run DDL in `beforeAll` outside the transaction.
- **AUTO_INCREMENT** counters are not rolled back. Inserted rows are undone, but the counter continues incrementing.
- **TRUNCATE TABLE** also causes an implicit commit. Use `DELETE FROM` if you need to clear data inside a transaction.

## Development

```bash
# Start MySQL
docker compose up -d

# Install dependencies
npm install

# Build
npm run build

# Run tests
cd test/basic && npm install && npm test
```

## License

MIT

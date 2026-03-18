import { setupDrizzleEnvironment } from "@siu-issiki/vitest-drizzle-mysql";
import { sql } from "drizzle-orm";
import { db, connection } from "./db.js";
import { users } from "./schema.js";

setupDrizzleEnvironment({
  client: () => db,
  disconnect: () => connection.end(),
});

// Create table before tests (DDL must be outside transaction)
beforeAll(async () => {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

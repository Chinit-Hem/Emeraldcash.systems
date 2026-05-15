import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

try {
  const sql = neon(connectionString);
  const [result] = await sql`select 1 as ok`;

  if (result?.ok !== 1) {
    throw new Error("Unexpected database response.");
  }

  console.log("Neon database connection OK.");
} catch (error) {
  console.error(
    `Neon database connection failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(1);
}

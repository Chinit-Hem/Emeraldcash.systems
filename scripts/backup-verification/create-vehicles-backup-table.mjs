import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL || "";
const BACKUP_TABLE_NAME = process.env.BACKUP_TABLE_NAME || "cleaned_vehicles_for_google_sheets";
const SOURCE_TABLE_NAME = process.env.PRODUCTION_TABLE_NAME || "vehicles";
const CONFIRMED = process.env.CONFIRM_CREATE_BACKUP_TABLE === "true";

function assertIdentifier(name, label) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`${label} must be a safe SQL identifier. Received: ${name}`);
  }
}

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required.");
  process.exit(1);
}

if (!CONFIRMED) {
  console.error(
    "Refusing to create a database backup table without explicit confirmation. " +
      "Set CONFIRM_CREATE_BACKUP_TABLE=true to run this write operation."
  );
  process.exit(1);
}

assertIdentifier(BACKUP_TABLE_NAME, "BACKUP_TABLE_NAME");
assertIdentifier(SOURCE_TABLE_NAME, "PRODUCTION_TABLE_NAME");

const sql = neon(DATABASE_URL);

console.log(`Creating backup table '${BACKUP_TABLE_NAME}' from '${SOURCE_TABLE_NAME}' if needed...`);

await sql`
  CREATE TABLE IF NOT EXISTS ${sql.unsafe(BACKUP_TABLE_NAME)}
  AS SELECT * FROM ${sql.unsafe(SOURCE_TABLE_NAME)} WHERE false
`;

await sql`
  INSERT INTO ${sql.unsafe(BACKUP_TABLE_NAME)}
  SELECT source.*
  FROM ${sql.unsafe(SOURCE_TABLE_NAME)} source
  WHERE NOT EXISTS (
    SELECT 1
    FROM ${sql.unsafe(BACKUP_TABLE_NAME)} backup
    WHERE backup.id = source.id
  )
`;

try {
  await sql`
    ALTER TABLE ${sql.unsafe(BACKUP_TABLE_NAME)}
    ADD PRIMARY KEY (id)
  `;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes("multiple primary keys") && !message.includes("already exists")) {
    throw error;
  }
}

const [sourceCount] = await sql`
  SELECT COUNT(*)::int AS count FROM ${sql.unsafe(SOURCE_TABLE_NAME)}
`;
const [backupCount] = await sql`
  SELECT COUNT(*)::int AS count FROM ${sql.unsafe(BACKUP_TABLE_NAME)}
`;

console.log(`Source rows: ${sourceCount.count}`);
console.log(`Backup rows: ${backupCount.count}`);

if (Number(backupCount.count) < Number(sourceCount.count)) {
  console.error("Backup table has fewer rows than source table. Investigate before release.");
  process.exit(1);
}

console.log("Backup table creation/verification complete.");

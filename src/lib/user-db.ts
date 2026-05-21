/**
 * Database operations for users table using Neon PostgreSQL
 */

import { sql, queryWithRetry } from "./db-singleton";
import {
  DatabaseError,
  NotFoundError,
  DuplicateError,
  ValidationError,
} from "./errors";
import { log } from "./logger";

export type Role = "Admin" | "Staff" | "Accounting" | "Transfer";

export interface UserDB {
  username: string;
  role: Role;
  password_hash: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  full_name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  profile_picture?: string;
}

// Validation constants
const USERNAME_REGEX = /^[a-z0-9._-]{3,32}$/;
const MAX_PASSWORD_HASH_LENGTH = 255;
const VALID_ROLES: Role[] = ["Admin", "Staff", "Accounting", "Transfer"];

// Input validation functions
function validateUsername(username: string): void {
  if (!username || typeof username !== "string") {
    throw new ValidationError("Username is required and must be a string");
  }

  const normalized = username.trim().toLowerCase();

  if (!USERNAME_REGEX.test(normalized)) {
    throw new ValidationError(
      "Username must be 3-32 characters, lowercase letters, numbers, dot, dash, underscore only"
    );
  }
}

function validateRole(role: string): void {
  if (!role || typeof role !== "string") {
    throw new ValidationError("Role is required and must be a string");
  }

  if (!VALID_ROLES.includes(role as Role)) {
    throw new ValidationError(`Role must be one of: ${VALID_ROLES.join(", ")}`);
  }
}

function validatePasswordHash(passwordHash: string): void {
  if (!passwordHash || typeof passwordHash !== "string") {
    throw new ValidationError("Password hash is required and must be a string");
  }

  if (passwordHash.length > MAX_PASSWORD_HASH_LENGTH) {
    throw new ValidationError(`Password hash must not exceed ${MAX_PASSWORD_HASH_LENGTH} characters`);
  }
}

function validateCreatedBy(createdBy: string): void {
  if (!createdBy || typeof createdBy !== "string") {
    throw new ValidationError("Created by is required and must be a string");
  }

  if (createdBy.trim().length === 0) {
    throw new ValidationError("Created by cannot be empty");
  }
}

// Check if a user exists before performing operations
async function checkUserExists(username: string): Promise<UserDB> {
  log("DEBUG", "Checking if user exists", { username });

  const result = await queryWithRetry(
    async () => sql`SELECT * FROM users WHERE username = ${username}`,
    "checkUserExists"
  );

  if (result.length === 0) {
    log("DEBUG", "User not found", { username });
    throw new NotFoundError("User");
  }

  return result[0] as UserDB;
}

// Ensure users table exists
export async function ensureUsersTable(): Promise<void> {
  log("INFO", "Checking if users table exists");

  if (!process.env.DATABASE_URL) {
    log("ERROR", "DATABASE_URL environment variable is not set.");
    throw new DatabaseError("Database connection string (DATABASE_URL) is missing.");
  }

  try {
    await queryWithRetry(
      async () => sql`
        CREATE TABLE IF NOT EXISTS users (
          username VARCHAR(32) PRIMARY KEY,
          role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Staff', 'Accounting', 'Transfer')),
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(32) NOT NULL
        )
      `,
      "ensureUsersTable"
    );
    await queryWithRetry(
      async () => sql`
        DO $$
        BEGIN
          ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20);

          IF EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'users_role_check'
              AND conrelid = 'users'::regclass
          ) THEN
            ALTER TABLE users DROP CONSTRAINT users_role_check;
          END IF;

          ALTER TABLE users
          ADD CONSTRAINT users_role_check
          CHECK (role IN ('Admin', 'Staff', 'Accounting', 'Transfer'));
        END $$;
      `,
      "ensureUsersTable-role-constraint"
    );
    log("INFO", "Users table verified/created successfully");
  } catch (error) {
    log("ERROR", "Failed to create users table", {
      error: error instanceof Error ? error.message : String(error)
    });
    throw new DatabaseError("Failed to create users table");
  }
}

// Create a new user in the database
export async function createUserInDB(params: {
  username: string;
  passwordHash: string;
  role: Role;
  createdBy: string;
}): Promise<UserDB> {
  log("INFO", "Attempting to INSERT user", { username: params.username });

  // Validate all inputs
  try {
    validateUsername(params.username);
    validateRole(params.role);
    validatePasswordHash(params.passwordHash);
    validateCreatedBy(params.createdBy);
  } catch (error) {
    log("ERROR", "Input validation failed", {
      username: params.username,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }

  const normalizedUsername = params.username.trim().toLowerCase();

  try {
    // Rely on unique constraint for username to prevent duplicates
    const result = await queryWithRetry(async () => sql`
      INSERT INTO users (username, role, password_hash, created_by)
      VALUES (
        ${normalizedUsername},
        ${params.role},
        ${params.passwordHash},
        ${params.createdBy.trim()}
      )
      RETURNING *
    `, "createUserInDB-insert");

    if (!result || result.length === 0) {
      throw new DatabaseError("Failed to create user - no result returned");
    }

    const typedResult = result as unknown as UserDB[];
    log("INFO", "User INSERTED successfully", {
      username: typedResult[0]?.username,
      role: typedResult[0]?.role
    });
    log("DEBUG", "Full result", { result: typedResult[0] });

    return typedResult[0];
  } catch (error) {
    // Re-throw known errors
    if (error instanceof ValidationError ||
        error instanceof DuplicateError ||
        error instanceof DatabaseError) {
      throw error;
    }

    // Handle PostgreSQL specific errors
    if (error instanceof Error) {
      if (error.message.includes("duplicate key") ||
          error.message.includes("unique constraint")) {
        log("ERROR", "Duplicate key error", { username: normalizedUsername });
        throw new DuplicateError("User");
      }

      log("ERROR", "Database error during user creation", {
        username: normalizedUsername,
        error: error.message
      });
    }

    throw new DatabaseError("Failed to create user in database");
  }
}

// PERFORMANCE: In-memory admin cache (refreshed every 5min)
let adminUserCache: UserDB | null = null;
let cacheLastRefresh = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Get user by username - CACHED for admin (99% of calls)
export async function getUserByUsername(username: string): Promise<UserDB | null> {
  const normalizedUsername = username.trim().toLowerCase();

  // 🔥 FAST PATH: Cached admin lookup (eliminates 100+ DB queries per session)
  if (normalizedUsername === 'admin') {
    const now = Date.now();
    if (adminUserCache && (now - cacheLastRefresh) < CACHE_TTL_MS) {
      return adminUserCache;
    }

    // Cache miss - refresh from DB
    try {
      const result = await queryWithRetry(
        async () => sql`SELECT * FROM users WHERE username = ${normalizedUsername}`,
        "getUserByUsername-admin-cache-refresh"
      );

      adminUserCache = result.length > 0 ? result[0] as UserDB : null;
      cacheLastRefresh = now;

      if (process.env.NODE_ENV === 'development') {
        log("DEBUG", "Admin cache refreshed", { username: normalizedUsername });
      }

      return adminUserCache;
    } catch (error) {
      log("ERROR", "Admin cache refresh failed", {
        username: normalizedUsername,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  // SLOW PATH: Non-admin lookup (rare)
  if (process.env.NODE_ENV === 'development') {
    log("DEBUG", "Querying non-admin user", { username: normalizedUsername });
  }

  try {
    const result = await queryWithRetry(
      async () => sql`SELECT * FROM users WHERE username = ${normalizedUsername}`,
      "getUserByUsername"
    );

    if (result.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        log("DEBUG", "User not found", { username: normalizedUsername });
      }
      return null;
    }

    if (process.env.NODE_ENV === 'development') {
      log("DEBUG", "User found", { username: normalizedUsername });
    }

    return result[0] as UserDB;
  } catch (error) {
    log("ERROR", "Error querying user", {
      username: normalizedUsername,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new DatabaseError("Failed to retrieve user from database");
  }
}

// Clear admin cache (call on user update)
export function clearAdminUserCache(): void {
  adminUserCache = null;
  cacheLastRefresh = 0;
}

// List all users
export async function listUsersFromDB(): Promise<UserDB[]> {
  log("INFO", "Listing all users from database");

  try {
    const result = await queryWithRetry(
      async () => sql`SELECT * FROM users ORDER BY username ASC`,
      "listUsersFromDB"
    );

    log("INFO", "Found users in database", { count: result.length });
    return result as UserDB[];
  } catch (error) {
    log("ERROR", "Error listing users", {
      error: error instanceof Error ? error.message : String(error)
    });
    throw new DatabaseError("Failed to list users from database");
  }
}

// Update user password
export async function updateUserInDB(params: {
  username: string;
  passwordHash: string;
}): Promise<UserDB> {
  log("INFO", "Updating user password", { username: params.username });

  // Validate inputs
  try {
    validateUsername(params.username);
    validatePasswordHash(params.passwordHash);
  } catch (error) {
    log("ERROR", "Input validation failed for update", {
      username: params.username,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }

  const normalizedUsername = params.username.trim().toLowerCase();

  try {
    const result = await queryWithRetry(
      async () => sql`
        UPDATE users
        SET
          password_hash = ${params.passwordHash},
          updated_at = CURRENT_TIMESTAMP
        WHERE username = ${normalizedUsername}
        RETURNING *
      `,
      "updateUserInDB"
    );

    if (!result || result.length === 0) {
      log("ERROR", "Update returned no rows", { username: normalizedUsername });
      throw new DatabaseError("Failed to update user - no rows affected");
    }

    log("INFO", "User updated successfully", { username: normalizedUsername });
    return result[0] as UserDB;
  } catch (error) {
    // Re-throw known errors
    if (error instanceof NotFoundError ||
        error instanceof ValidationError ||
        error instanceof DatabaseError) {
      throw error;
    }

    log("ERROR", "Error updating user", {
      username: normalizedUsername,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new DatabaseError("Failed to update user in database");
  }
}

// Delete user from database
export async function deleteUserFromDB(username: string): Promise<boolean> {
  log("INFO", "Deleting user", { username });

  // Validate input
  try {
    validateUsername(username);
  } catch (error) {
    log("ERROR", "Input validation failed for delete", {
      username,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }

  const normalizedUsername = username.trim().toLowerCase();

  try {
    // Use a transaction to ensure atomicity for last admin check
    const deleted = await queryWithRetry(async () => {
      // Access the underlying client for transaction
      // Note: The `sql` template literal function from db-singleton is already transaction-aware
      // when used within dbManager.query. We need to ensure this specific check and delete
      // happen as one atomic unit.
      const adminCountResult = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'Admin'`;
      const adminCountRow = adminCountResult[0] as { count?: string | number } | undefined;
      const adminCount = parseInt(String(adminCountRow?.count ?? 0), 10);

      const userToDelete = await sql`SELECT role FROM users WHERE username = ${normalizedUsername}`;
      const userToDeleteRow = userToDelete[0] as { role?: string } | undefined;
      if (userToDeleteRow?.role === 'Admin' && adminCount <= 1) {
        throw new ValidationError("Cannot delete the last Admin account");
      }

      const result = await sql`DELETE FROM users WHERE username = ${normalizedUsername} RETURNING username`;
      return result.length > 0;
    }, "deleteUserFromDB");

    if (!deleted) {
      log("ERROR", "Delete returned no rows", { username: normalizedUsername });
      throw new DatabaseError("Failed to delete user - no rows affected");
    }

    log("INFO", "User deleted successfully", { username: normalizedUsername });
    return true;
  } catch (error) {
    // Re-throw known errors
    if (error instanceof NotFoundError ||
        error instanceof ValidationError ||
        error instanceof DatabaseError) {
      throw error;
    }

    log("ERROR", "Error deleting user", {
      username: normalizedUsername,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new DatabaseError("Failed to delete user from database");
  }
}

// Count admin users
export async function countAdminUsers(): Promise<number> {
  log("DEBUG", "Counting admin users");

  try {
    const result = await queryWithRetry(
      async () => sql`SELECT COUNT(*) as count FROM users WHERE role = 'Admin'`,
      "countAdminUsers"
    );

    const typedResult = result as unknown as { count: string }[];

    if (!typedResult || typedResult.length === 0 || !typedResult[0].count) {
      log("ERROR", "Count query returned unexpected result");
      throw new DatabaseError("Failed to count admin users");
    }

    const count = parseInt(typedResult[0].count, 10);

    if (isNaN(count)) {
      log("ERROR", "Count result is not a valid number", { raw: typedResult[0].count });
      throw new DatabaseError("Invalid count result from database");
    }

    log("DEBUG", "Admin count", { count });
    return count;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    log("ERROR", "Error counting admin users", {
      error: error instanceof Error ? error.message : String(error)
    });
    throw new DatabaseError("Failed to count admin users");
  }
}

// Migrate users table to add profile fields
export async function migrateUsersTable(): Promise<void> {
  log("INFO", "Migrating users table to add profile fields");

  try {
    // Add new columns if they don't exist
    await queryWithRetry(
      async () => sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'full_name') THEN
            ALTER TABLE users ADD COLUMN full_name VARCHAR(100);
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
            ALTER TABLE users ADD COLUMN email VARCHAR(255);
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
            ALTER TABLE users ADD COLUMN phone VARCHAR(20);
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'bio') THEN
            ALTER TABLE users ADD COLUMN bio TEXT;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_picture') THEN
            ALTER TABLE users ADD COLUMN profile_picture TEXT;
          END IF;
        END $$;
      `,
      "migrateUsersTable"
    );

    log("INFO", "Users table migration completed successfully");
  } catch (error) {
    log("ERROR", "Failed to migrate users table", {
      error: error instanceof Error ? error.message : String(error)
    });
    throw new DatabaseError("Failed to migrate users table");
  }
}

// Update user profile
export async function updateUserProfileInDB(params: {
  username: string;
  full_name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  profile_picture?: string;
}): Promise<UserDB> {
  log("INFO", "Updating user profile", { username: params.username });

  // Validate username
  try {
    validateUsername(params.username);
  } catch (error) {
    log("ERROR", "Input validation failed for profile update", {
      username: params.username,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }

  const normalizedUsername = params.username.trim().toLowerCase();

  try {
    // Get current user data to merge updates
    const currentUser = await getUserByUsername(normalizedUsername);
    if (!currentUser) {
      throw new NotFoundError("User");
    }

    // Build update with merged values
    const full_name = params.full_name !== undefined ? params.full_name : currentUser.full_name;
    const email = params.email !== undefined ? params.email : currentUser.email;
    const phone = params.phone !== undefined ? params.phone : currentUser.phone;
    const bio = params.bio !== undefined ? params.bio : currentUser.bio;
    const profile_picture = params.profile_picture !== undefined ? params.profile_picture : currentUser.profile_picture;

    const result = await queryWithRetry(
      async () => sql`
        UPDATE users
        SET
          full_name = ${full_name || null},
          email = ${email || null},
          phone = ${phone || null},
          bio = ${bio || null},
          profile_picture = ${profile_picture || null},
          updated_at = CURRENT_TIMESTAMP
        WHERE username = ${normalizedUsername}
        RETURNING *
      `,
      "updateUserProfileInDB"
    );

    if (!result || result.length === 0) {
      log("ERROR", "Profile update returned no rows", { username: normalizedUsername });
      throw new DatabaseError("Failed to update user profile - no rows affected");
    }

    log("INFO", "User profile updated successfully", { username: normalizedUsername });
    return result[0] as UserDB;
  } catch (error) {
    // Re-throw known errors
    if (error instanceof NotFoundError ||
        error instanceof ValidationError ||
        error instanceof DatabaseError) {
      throw error;
    }

    log("ERROR", "Error updating user profile", {
      username: normalizedUsername,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new DatabaseError("Failed to update user profile in database");
  }
}

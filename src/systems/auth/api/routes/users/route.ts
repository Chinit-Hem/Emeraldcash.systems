import { getSession, hasAppPermission, requirePermission } from "@/lib/auth-helpers";
import { auditEventFromRequest, recordAuditEvent } from "@/lib/audit-log";
import {
  createSessionCookie,
  getClientIp,
  getClientUserAgent,
} from "@/lib/auth";
import {
  isDuplicateError,
  isNotFoundError,
  isValidationError,
} from "@/lib/errors";
import { generateRequestId, log } from "@/lib/logger";
import { validatePasswordPolicy } from "@/lib/password-policy";
import { createUser, deleteUser, hashPassword, invalidateUsersCache, listUsers } from "@/lib/userStore";
import { NextRequest, NextResponse } from "next/server";

// Validation constants
const USERNAME_REGEX = /^[a-z0-9._-]{3,32}$/;
type SystemRole = "Admin" | "Staff" | "Accounting";
const VALID_ROLES: SystemRole[] = ["Admin", "Staff", "Accounting"];

// Security headers for all responses
const securityHeaders = {
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

// Cache control headers
const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

// Validation result types
type ValidationSuccess<T> = { valid: true; value: T };
type ValidationError = { valid: false; error: string };
type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

// Input validation functions
function validateUsername(username: unknown): ValidationResult<string> {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username is required and must be a string" };
  }
  
  const trimmed = username.trim();
  
  if (!trimmed) {
    return { valid: false, error: "Username cannot be empty" };
  }
  
  if (!USERNAME_REGEX.test(trimmed.toLowerCase())) {
    return { 
      valid: false, 
      error: "Username must be 3-32 characters, lowercase letters, numbers, dot, dash, underscore only" 
    };
  }
  
  return { valid: true, value: trimmed };
}

function validatePassword(password: unknown): ValidationResult<string> {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required and must be a string" };
  }

  const passwordError = validatePasswordPolicy(password);
  if (passwordError) {
    return { valid: false, error: passwordError };
  }
  
  return { valid: true, value: password };
}

function validateRole(role: unknown): ValidationResult<SystemRole> {
  if (!role || typeof role !== "string") {
    return { valid: false, error: "Role is required and must be a string" };
  }
  
  if (!VALID_ROLES.includes(role as SystemRole)) {
    return { valid: false, error: `Role must be one of: ${VALID_ROLES.join(", ")}` };
  }
  
  return { valid: true, value: role as SystemRole };
}

// Helper to create error response
function createErrorResponse(error: string, code: string, status: number) {
  return NextResponse.json(
    { ok: false, error, code },
    { 
      status,
      headers: { ...securityHeaders, ...noCacheHeaders }
    }
  );
}

// Helper to create success response
function createSuccessResponse(data: Record<string, unknown>, status: number = 200) {
  return NextResponse.json(
    { ok: true, ...data },
    { 
      status,
      headers: { ...securityHeaders, ...noCacheHeaders }
    }
  );
}

function getSessionCookieOptions(req: NextRequest) {
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const isActuallyHttps = forwardedProto === "https" || req.nextUrl.protocol === "https:";
  const isProduction = process.env.NODE_ENV === "production";
  const allowInsecureCookies = !isProduction && process.env.ALLOW_HTTP_COOKIES === "true";

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: (isProduction || isActuallyHttps) && !allowInsecureCookies,
    path: "/",
    maxAge: 60 * 60 * 8,
  };
}


export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, "users:view");
    if (auth.response) {
      log("WARN", "GET /api/auth/users - Access denied", {
        cookies: req.cookies.get("session")?.value ? "present" : "missing",
      });
      return auth.response;
    }

    // Fetch users (cached in userStore)
    const users = await listUsers();
    
    return createSuccessResponse({ users });
  } catch (error) {
    console.error("[GET /api/auth/users] Error:", error);
    return createErrorResponse(
      "Failed to retrieve users", 
      "internal_error", 
      500
    );
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  log("INFO", "POST /api/auth/users - Request started", { requestId });
  
  try {
    const auth = requirePermission(req, "users:create");
    if (auth.response) {
      log("WARN", "POST /api/auth/users - Insufficient permission", {
        requestId, 
        cookies: req.cookies.get("session")?.value ? "present" : "missing",
      });
      await recordAuditEvent(auditEventFromRequest(req, {
        action: "user.create.denied",
        resourceType: "user",
        status: "denied",
        severity: "warning",
      }));
      return auth.response;
    }
    const session = auth.session;

    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch (parseError) {
      log("WARN", "POST /api/auth/users - Invalid JSON body", { 
        requestId,
        error: parseError instanceof Error ? parseError.message : String(parseError)
      });
      return createErrorResponse("Invalid JSON in request body", "invalid_json", 400);
    }

    log("DEBUG", "POST /api/auth/users - Request body received", { 
      requestId,
      hasUsername: !!body.username,
      hasPassword: !!body.password,
      hasRole: !!body.role
    });

    // Validate all inputs
    const usernameValidation = validateUsername(body.username);
    if (usernameValidation.valid === false) {
      log("WARN", "POST /api/auth/users - Username validation failed", { 
        requestId,
        error: usernameValidation.error 
      });
      return createErrorResponse(usernameValidation.error, "invalid_username", 400);
    }

    const passwordValidation = validatePassword(body.password);
    if (passwordValidation.valid === false) {
      log("WARN", "POST /api/auth/users - Password validation failed", { 
        requestId,
        error: passwordValidation.error 
      });
      return createErrorResponse(passwordValidation.error, "invalid_password", 400);
    }

    const roleValidation = validateRole(body.role);
    if (roleValidation.valid === false) {
      log("WARN", "POST /api/auth/users - Role validation failed", { 
        requestId,
        error: roleValidation.error 
      });
      return createErrorResponse(roleValidation.error, "invalid_role", 400);
    }

    log("DEBUG", "POST /api/auth/users - All inputs validated, creating user", { 
      requestId,
      username: usernameValidation.value,
      role: roleValidation.value,
      createdBy: session.username
    });

    // Create user
    const result = await createUser({
      username: usernameValidation.value,
      password: passwordValidation.value,
      role: roleValidation.value,
      createdBy: session.username,
      full_name: typeof body.full_name === "string" ? body.full_name.trim() || null : null,
      email: typeof body.email === "string" ? body.email.trim() || null : null,
      phone: typeof body.phone === "string" ? body.phone.trim() || null : null,
    });

    if (result.ok === false) {
      const code = result.code;
      const errorMessage = result.error;
      
      log("WARN", "POST /api/auth/users - User creation failed", { 
        requestId,
        code,
        error: errorMessage,
        username: usernameValidation.value
      });
      
      // Map error codes to appropriate HTTP status codes
      const statusMap: Record<string, number> = {
        "already_exists": 409,
        "invalid_username": 400,
        "invalid_password": 400,
        "invalid_role": 400,
        "database_error": 500,
      };
      
      const status = statusMap[code] || 400;
      return createErrorResponse(errorMessage, code, status);
    }

    invalidateUsersCache();

    log("INFO", "POST /api/auth/users - User created successfully", { 
      requestId,
      username: result.user.username,
      role: result.user.role,
      createdBy: session.username
    });
    await recordAuditEvent(auditEventFromRequest(req, {
      action: "user.create.success",
      actorUsername: session.username,
      actorRole: session.role,
      resourceType: "user",
      resourceId: result.user.username,
      status: "success",
      metadata: { role: result.user.role },
    }));

    return createSuccessResponse({ user: result.user }, 201);
  } catch (error) {
    log("ERROR", "POST /api/auth/users - Unexpected error", { 
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Check for specific error types
    if (isDuplicateError(error)) {
      return createErrorResponse("Username already exists", "already_exists", 409);
    }
    
    if (isValidationError(error)) {
      return createErrorResponse(error.message, "validation_error", 400);
    }
    
    return createErrorResponse(
      "Failed to create user", 
      "internal_error", 
      500
    );
  }
}

export async function PUT(req: NextRequest) {
  const requestId = generateRequestId();
  log("INFO", "PUT /api/auth/users - Request started", { requestId });
  
  try {
    // Authenticate session
    const session = getSession(req);
    if (!session) {
      log("WARN", "PUT /api/auth/users - Unauthorized access attempt", { requestId });
      return createErrorResponse("Invalid or expired session", "unauthorized", 401);
    }

    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch (parseError) {
      log("WARN", "PUT /api/auth/users - Invalid JSON body", { 
        requestId,
        error: parseError instanceof Error ? parseError.message : String(parseError)
      });
      return createErrorResponse("Invalid JSON in request body", "invalid_json", 400);
    }

    const sessionUsername = session.username.trim().toLowerCase();
    const targetUsernameValidation = validateUsername(body.username || session.username);
    if (targetUsernameValidation.valid === false) {
      return createErrorResponse(targetUsernameValidation.error, "invalid_username", 400);
    }
    const targetUsername = targetUsernameValidation.value.toLowerCase();

    let nextUsername = targetUsername;
    const rawNextUsername = body.newUsername ?? body.new_username;
    if (rawNextUsername !== undefined) {
      const nextUsernameValidation = validateUsername(rawNextUsername);
      if (nextUsernameValidation.valid === false) {
        return createErrorResponse(nextUsernameValidation.error, "invalid_username", 400);
      }
      nextUsername = nextUsernameValidation.value.toLowerCase();
    }

    const rawPassword = body.password ?? body.newPassword ?? body.new_password;
    const hasPasswordUpdate = rawPassword !== undefined && rawPassword !== "";
    if (hasPasswordUpdate) {
      const passwordValidation = validatePassword(rawPassword);
      if (passwordValidation.valid === false) {
        return createErrorResponse(passwordValidation.error, "invalid_password", 400);
      }

      const rawConfirmPassword = body.confirmPassword ?? body.confirm_password;
      if (rawConfirmPassword !== undefined && rawConfirmPassword !== passwordValidation.value) {
        return createErrorResponse("Passwords do not match", "password_mismatch", 400);
      }
    }

    const rawRole = body.role ?? body.newRole ?? body.new_role;
    const hasRoleUpdate = rawRole !== undefined;
    let nextRole: SystemRole | undefined;
    if (hasRoleUpdate) {
      const roleValidation = validateRole(rawRole);
      if (roleValidation.valid === false) {
        return createErrorResponse(roleValidation.error, "invalid_role", 400);
      }
      nextRole = roleValidation.value;
    }

    const hasAccountUpdate = nextUsername !== targetUsername || hasPasswordUpdate || hasRoleUpdate;
    
    // Users can only update their own profile unless their role can edit users.
    if (sessionUsername !== targetUsername && !hasAppPermission(session.role, "users:edit")) {
      log("WARN", "PUT /api/auth/users - Forbidden: can only update own profile", { 
        requestId,
        username: session.username,
        targetUsername
      });
      await recordAuditEvent(auditEventFromRequest(req, {
        action: "user.update.denied",
        actorUsername: session.username,
        actorRole: session.role,
        resourceType: "user",
        resourceId: targetUsername,
        status: "denied",
        severity: "warning",
        metadata: { reason: "not_own_profile" },
      }));
      return createErrorResponse("Can only update your own profile", "forbidden", 403);
    }

    if (hasRoleUpdate && !hasAppPermission(session.role, "users:edit")) {
      log("WARN", "PUT /api/auth/users - Forbidden: role update requires users:edit", {
        requestId,
        username: session.username,
        targetUsername,
      });
      await recordAuditEvent(auditEventFromRequest(req, {
        action: "user.role_update.denied",
        actorUsername: session.username,
        actorRole: session.role,
        resourceType: "user",
        resourceId: targetUsername,
        status: "denied",
        severity: "warning",
      }));
      return createErrorResponse("Only admins can update roles", "forbidden", 403);
    }

    if (hasAccountUpdate && !hasAppPermission(session.role, "users:edit")) {
      log("WARN", "PUT /api/auth/users - Forbidden: account update requires users:edit", {
        requestId,
        username: session.username,
        targetUsername,
      });
      await recordAuditEvent(auditEventFromRequest(req, {
        action: "user.account_update.denied",
        actorUsername: session.username,
        actorRole: session.role,
        resourceType: "user",
        resourceId: targetUsername,
        status: "denied",
        severity: "warning",
      }));
      return createErrorResponse("Only admins can update usernames, passwords, or roles here", "forbidden", 403);
    }

    log("DEBUG", "PUT /api/auth/users - Ensuring table migrated", { requestId });
    
    // Ensure table has profile columns
    const { migrateUsersTable } = await import("@/lib/user-db");
    await migrateUsersTable();

    log("DEBUG", "PUT /api/auth/users - Updating account", {
      requestId,
      targetUsername,
      nextUsername,
      hasPasswordUpdate,
      hasRoleUpdate,
      requestedBy: session.username
    });

    const passwordHash = hasPasswordUpdate && typeof rawPassword === "string"
      ? await hashPassword(rawPassword)
      : undefined;

    // Update user profile/account details.
    const { updateUserAccountInDB } = await import("@/lib/user-db");
    const updatedUser = await updateUserAccountInDB({
      currentUsername: targetUsername,
      username: nextUsername,
      passwordHash,
      role: nextRole,
      full_name: body.full_name as string | undefined,
      email: body.email as string | undefined,
      phone: body.phone as string | undefined,
      bio: body.bio as string | undefined,
      profile_picture: body.profile_picture as string | undefined,
    });

    invalidateUsersCache();

    log("INFO", "PUT /api/auth/users - Account updated successfully", {
      requestId,
      username: updatedUser.username
    });
    await recordAuditEvent(auditEventFromRequest(req, {
      action: hasAccountUpdate ? "user.account_update.success" : "user.profile_update.success",
      actorUsername: session.username,
      actorRole: session.role,
      resourceType: "user",
      resourceId: updatedUser.username,
      status: "success",
      metadata: {
        previousUsername: targetUsername,
        roleChanged: hasRoleUpdate,
        passwordChanged: hasPasswordUpdate,
        usernameChanged: nextUsername !== targetUsername,
      },
    }));

    const response = createSuccessResponse({
      user: {
        username: updatedUser.username,
        role: updatedUser.role,
        full_name: updatedUser.full_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        bio: updatedUser.bio,
        profile_picture: updatedUser.profile_picture,
      }
    });

    if (sessionUsername === targetUsername && (updatedUser.username !== sessionUsername || updatedUser.role !== session.role)) {
      const userAgent = getClientUserAgent(req.headers);
      const ip = getClientIp(req.headers);
      const sessionCookie = createSessionCookie(
        {
          username: updatedUser.username,
          role: updatedUser.role,
          ...(session.staffId ? { staffId: session.staffId } : {}),
          ...(session.userId ? { userId: session.userId } : {}),
        },
        userAgent,
        ip
      );
      response.cookies.set("session", sessionCookie, getSessionCookieOptions(req));
    }

    return response;
  } catch (error) {
    log("ERROR", "PUT /api/auth/users - Unexpected error", { 
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (isNotFoundError(error)) {
      return createErrorResponse("User not found", "not_found", 404);
    }

    if (isDuplicateError(error)) {
      return createErrorResponse("Username already exists", "already_exists", 409);
    }
    
    if (isValidationError(error)) {
      return createErrorResponse(error.message, "validation_error", 400);
    }
    
    return createErrorResponse(
      "Failed to update profile", 
      "internal_error", 
      500
    );
  }
}

// Simplified mutations with cache invalidation
export async function DELETE(req: NextRequest) {
  const auth = requirePermission(req, "users:delete");
  if (auth.response) {
    log("WARN", "DELETE /api/auth/users - Insufficient permission", {
      cookies: req.cookies.get("session")?.value ? "present" : "missing",
    });
    await recordAuditEvent(auditEventFromRequest(req, {
      action: "user.delete.denied",
      resourceType: "user",
      status: "denied",
      severity: "warning",
    }));
    return auth.response;
  }
  const session = auth.session;

  let body;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse("Invalid JSON", "invalid_json", 400);
  }

  const usernameValidation = validateUsername(body.username);
  if (usernameValidation.valid === false) {
    return createErrorResponse(usernameValidation.error, "invalid_username", 400);
  }

  const result = await deleteUser({
    username: usernameValidation.value,
    requestedBy: session.username,
  });

  if (result.ok === false) {
    const statusMap: Record<string, number> = {
      "not_found": 404,
      "self_delete_forbidden": 403,
      "last_admin_forbidden": 409,
      "invalid_username": 400,
      "database_error": 500,
    };
    const status = statusMap[result.code || ''] || 400;
    return createErrorResponse(result.error, result.code, status);
  }

  invalidateUsersCache();
  await recordAuditEvent(auditEventFromRequest(req, {
    action: "user.delete.success",
    actorUsername: session.username,
    actorRole: session.role,
    resourceType: "user",
    resourceId: result.user.username,
    status: "success",
    metadata: { role: result.user.role },
  }));

  return createSuccessResponse({ user: result.user });
}

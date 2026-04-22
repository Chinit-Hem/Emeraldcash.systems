## Emerald Cash VMS (Next.js)

This app uses a Google Sheet as the database via a Google Apps Script web app.

## Getting Started

### 1) Configure environment variables

Create (or edit) `.env.local` in the project root (do **not** commit this file):

```bash
# Existing variables
NEXT_PUBLIC_API_URL="https://script.google.com/macros/s/AKfycbwlIp823Km3GEcMhWip_cZSlZ9GRlf1HptIucXdvz2qI14vsn_3Zq_Z27QyblOOLdUuMQ/exec"
SESSION_SECRET="emerald_vms_2026_secure_key_168"

# Add this for image uploads
APPS_SCRIPT_UPLOAD_TOKEN="ya29.a0AWY7CkkJ0xX1z3bX8KfN5JH3kD3VJ8Y2F1bGxjZWRfX2tleV9oZXJl"

# Drive folder links for reference:
# Cars: https://drive.google.com/drive/folders/1UKgtZ_sSNSVy3p-8WBwBrploVL9IDxec?usp=sharing
# Motorcycles: https://drive.google.com/drive/folders/10OcxTtK6ZqQj5cvPMNNIP4VsaVneGiYP?usp=sharing
# Tuk Tuks: https://drive.google.com/drive/folders/18oDOlZXE9JGE5EDZ7yL6oBRVG6SgVYdP?usp=sharing

# Optional: Additional configuration
APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycbx5SyxFn2NmSeXvh-RAq16upfc4-B0TiGRU7kfldDgXbYQI2WF37ZM-W8RVcVrMFYWcSQ/exec"

```

### 2) Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Demo login

- `admin / 1234` (Admin)
- `staff / 1234` (Staff)

### Admin user management

- Admin can create employee accounts in `Settings`.
- Roles supported: `Admin`, `Staff`.
- You can also pre-seed users via env vars:
  - `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`
  - `STAFF_USERNAME`, `STAFF_PASSWORD_HASH`
  - `AUTH_USERS_JSON` (array of users with bcrypt hashes)

### Apps Script actions expected

- `getVehicles` (GET via query param `?action=getVehicles`)
- `add` (POST JSON: `{ "action": "add", "data": { ... } }`)
- `update` (POST JSON: `{ "action": "update", "id": "<VehicleId>", "data": { ... } }`)
- `delete` (POST JSON: `{ "action": "delete", "id": "<VehicleId>" }`)
- `uploadImage` (POST JSON: `{ "action": "uploadImage", ... }`) *(optional, for file uploads)*

### Google Sheet columns (order matters)

Make sure row 1 in your `Vehicles` sheet uses this column order:

1. `#`
2. `Image`
3. `Category`
4. `Brand`
5. `Model`
6. `Year`
7. `Plate`
8. `MARKET PRICE`
9. `D.O.C.40%`
10. `Vehicles70%`
11. `Tax Type`
12. `Condition`
13. `Body Type`
14. `Color`
15. `Time`

### Drive folders (per Category)

When uploading an image file from the UI, the app will call Apps Script `action=uploadImage` and save the image into the correct Google Drive folder based on `Category`:

- Cars: `1UKgtZ_sSNSVy3p-8WBwBrploVL9IDxec`
- Motorcycles: `10OcxTtK6ZqQj5cvPMNNIP4VsaVneGiYP`
- Tuk Tuk: `18oDOlZXE9JGE5EDZ7yL6oBRVG6SgVYdP`

You can override these defaults in `.env.local` (server-side only):

```bash
DRIVE_FOLDER_CARS="1UKgtZ_sSNSVy3p-8WBwBrploVL9IDxec"
DRIVE_FOLDER_MOTORCYCLES="10OcxTtK6ZqQj5cvPMNNIP4VsaVneGiYP"
DRIVE_FOLDER_TUKTUK="18oDOlZXE9JGE5EDZ7yL6oBRVG6SgVYdP"
```

To secure uploads, set an optional shared token:

```bash
APPS_SCRIPT_UPLOAD_TOKEN="change-me"
```

Then implement `uploadImage` in your Apps Script (see `apps-script/uploadImage.gs`).

### Session security

Set a session signing secret so users cannot change their role by editing cookies (recommended for production deployments):

```bash
SESSION_SECRET="change-me-please-use-a-long-random-string"
```

### Vercel deployment env vars

In Vercel → Project Settings → Environment Variables, set:

- `NEXT_PUBLIC_API_URL`
- `SESSION_SECRET`
- `APPS_SCRIPT_UPLOAD_TOKEN` (required for image uploads)
- `APPS_SCRIPT_URL` (optional; use same URL if you use one Apps Script)

Select **Production + Preview + Development**, then **Redeploy**.

### Delete from Drive too (optional)

When deleting a vehicle from the UI, the app sends `imageFileId` (when available) to Apps Script `action=delete`.

Update your Apps Script delete handler to also move the Drive image to Trash (see `apps-script/deleteVehicleWithImage.gs`).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Error Handling & Logging

This application implements a comprehensive error handling strategy with structured logging, defensive programming, and user-friendly error responses.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Error Handling Layers                      │
├─────────────────────────────────────────────────────────────┤
│  1. Client Layer                                            │
│     ├── ErrorBoundary (React class component)                 │
│     ├── error.tsx (Next.js error boundary)                  │
│     └── global-error.tsx (Critical error handler)           │
├─────────────────────────────────────────────────────────────┤
│  2. Middleware Layer                                        │
│     ├── Request ID generation                               │
│     ├── Global try-catch wrapper                            │
│     └── Structured error logging                            │
├─────────────────────────────────────────────────────────────┤
│  3. API Route Layer                                         │
│     ├── withErrorHandling() HOC wrapper                     │
│     ├── Input validation                                    │
│     ├── Timeout handling                                    │
│     └── Sanitized error responses                           │
├─────────────────────────────────────────────────────────────┤
│  4. Service Layer                                           │
│     ├── Business logic error handling                         │
│     └── Database error wrapping                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Structured Logger (`src/lib/logger.ts`)

Machine-readable JSON logs with:
- **requestId**: Unique identifier for tracing requests across the stack
- **timestamp**: ISO 8601 format
- **userId**: Authenticated user (when available)
- **context**: Component/service name
- **stackTrace**: Full error stack (development only in console)

**Usage:**
```typescript
import { createRequestLogger } from "@/lib/logger";

const logger = createRequestLogger();
logger.info("Operation started", { userId: "123" });
logger.error("Database connection failed", error, { query: "SELECT..." });
```

**Log Output (Production):**
```json
{
  "level": "error",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user_123",
  "message": "Database connection failed",
  "context": "vehicles-api",
  "error": {
    "name": "ConnectionError",
    "message": "Connection terminated unexpectedly",
    "stack": "..."
  },
  "data": {
    "query": "SELECT * FROM vehicles",
    "durationMs": 5000
  }
}
```

#### 2. API Error Wrapper (`src/lib/api-error-wrapper.ts`)

Higher-order function that automatically wraps API handlers with:
- Try-catch error handling
- Request timeout protection (default: 30s)
- Consistent error response format
- Request ID tracking
- Performance metrics

**Usage:**
```typescript
import { withErrorHandling, createSuccessResponse, createErrorResponse } from "@/lib/api-error-wrapper";

export const GET = withErrorHandling(async (req, { logger, requestId, startTime }) => {
  // Your handler logic here
  // Errors are automatically caught and logged
  
  // Return success
  return createSuccessResponse(data, requestId, Date.now() - startTime, meta);
  
  // Or return error (sanitized for users)
  return createErrorResponse("Invalid input", requestId, duration, 400);
}, { context: "my-api", timeoutMs: 30000 });
```

**Error Response Format:**
```json
{
  "success": false,
  "error": "An internal error occurred. Our team has been notified.",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "meta": {
    "durationMs": 150,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### 3. Error Boundaries

**Root Error Boundary** (`src/app/error.tsx`):
- Catches errors in layout and page components
- Provides retry functionality
- Logs to monitoring service
- Shows user-friendly error UI

**Global Error Handler** (`src/app/global-error.tsx`):
- Last line of defense for critical errors
- Handles errors that escape all other boundaries
- Full-page error display with reload option

**App Section Error Boundary** (`src/app/(app)/error.tsx`):
- Catches errors within the authenticated app section
- Provides navigation options (Dashboard, Reload)

#### 4. Middleware Error Handling (`middleware.ts`)

- Global try-catch wrapper around all middleware logic
- Request ID generation and propagation
- Structured logging for auth failures
- Sanitized error responses for API routes

### Defensive Programming Patterns

#### Input Validation
```typescript
// Validate numeric parameters
const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 1000);
const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

// Validate enums
if (!["ASC", "DESC"].includes(orderDirection)) {
  return createErrorResponse("Invalid orderDirection", requestId, duration, 400);
}

// Validate ranges
if (year < 1900 || year > 2100) {
  return createErrorResponse("Invalid year", requestId, duration, 400);
}
```

#### Required Field Validation
```typescript
const requiredFields = ["category", "brand", "model", "year", "plate"];
const missingFields = requiredFields.filter(field => !data[field]);

if (missingFields.length > 0) {
  return createErrorResponse(
    `Missing required fields: ${missingFields.join(", ")}`,
    requestId,
    duration,
    400
  );
}
```

#### Timeout Protection
```typescript
const handler = withErrorHandling(async (req, context) => {
  // Automatically wrapped with 30s timeout
  const result = await fetchData();
  return createSuccessResponse(result, context.requestId, Date.now() - context.startTime);
}, { timeoutMs: 30000 });
```

### Error Sanitization

User-facing messages are sanitized to hide technical details:

| Error Type | User Message | Logged Details |
|------------|--------------|----------------|
| Database connection | "Service temporarily unavailable" | Full connection error, stack trace |
| Validation error | "Invalid request. Please check your input." | Which field failed, expected format |
| Auth failure | "Authentication failed. Please log in again." | Token validation error, IP address |
| Not found | "The requested resource was not found." | Resource type, ID attempted |
| Timeout | "Request timeout. Please try again." | Operation that timed out, duration |
| Unknown | "An internal error occurred. Our team has been notified." | Full error object, stack trace |

### Environment Variables

```bash
# Logging configuration
LOG_LEVEL=info  # debug, info, warn, error, fatal

# External error tracking (optional)
# SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
# BETTER_STACK_TOKEN=your_token_here
```

### Best Practices for New Routes

1. **Always use the error wrapper:**
   ```typescript
   export const GET = withErrorHandling(handler, options);
   ```

2. **Validate all inputs:**
   - Check required fields
   - Validate data types and ranges
   - Sanitize user input

3. **Use structured logging:**
   ```typescript
   logger.info("Operation completed", { recordCount: 100 });
   logger.error("Operation failed", error, { recordId: "123" });
   ```

4. **Return consistent responses:**
   - Success: `createSuccessResponse(data, requestId, duration, meta)`
   - Error: `createErrorResponse(message, requestId, duration, statusCode)`

5. **Add request ID to all responses:**
   - Automatically handled by wrapper
   - Available in `X-Request-ID` header for debugging

### Testing Error Handling

```bash
# Test API error handling
curl -X GET "http://localhost:3000/api/vehicles?limit=invalid" \
  -H "Accept: application/json"

# Should return:
# {
#   "success": false,
#   "error": "Invalid limit parameter",
#   "requestId": "xxx",
#   "meta": { "durationMs": 10, "timestamp": "..." }
# }
```

### External Error Tracking Integration

To integrate with Sentry, BetterStack, or other services:

1. **Install the SDK:**
   ```bash
   npm install @sentry/nextjs
   ```

2. **Initialize in error boundaries:**
   ```typescript
   // In error.tsx and global-error.tsx
   useEffect(() => {
     Sentry.captureException(error);
   }, [error]);
   ```

3. **Add to logger:**
   ```typescript
   // In logger.ts, add to output() method
   if (process.env.SENTRY_DSN && entry.level === "error") {
     Sentry.captureMessage(entry.message, entry.level);
   }
   ```

### Monitoring & Alerting

Key metrics to monitor:
- **Error rate**: 500 responses / total requests
- **P95 response time**: Should be < 500ms for cached data
- **Timeout rate**: Requests hitting 30s timeout
- **Auth failures**: 401/403 responses

All errors include `requestId` for correlation across logs, making it easy to trace a user-reported issue through the entire stack.

#   E C V M S  
 #   E C V M S  
 # ecvls_systems

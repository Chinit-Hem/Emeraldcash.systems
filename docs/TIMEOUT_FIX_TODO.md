# Timeout Fix Implementation Plan

## Problem Analysis
The timeout error occurs because there's a **mismatch between timeout configurations**:
- Client-side (`api.ts`): `FETCH_TIMEOUT_MS = 60000` (60 seconds)
- API Route wrapper (`route.ts`): `withErrorHandling` has `timeoutMs: 30000` (30 seconds)
- Handler internal (`route.ts`): `HANDLER_TIMEOUT_MS = 45000` (45 seconds)
- Database (`BaseService.ts`): `QUERY_TIMEOUT_MS = 30000` (30 seconds)

## Implementation Steps

### Step 1: Increase API Route Wrapper Timeout
- [x] Update `src/app/api/vehicles/route.ts`
  - Change `withErrorHandling` timeout from 30000 to 60000 for GET handler
  - Change `withErrorHandling` timeout from 30000 to 60000 for POST handler
  - Change `withErrorHandling` timeout from 30000 to 60000 for DELETE handler

### Step 2: Increase Database Query Timeout
- [x] Update `src/services/BaseService.ts`
  - Change `QUERY_TIMEOUT_MS` from 30000 to 45000

### Step 3: Add Request Cancellation Support
- [x] Update `src/lib/useVehicles.ts`
  - Add AbortController to cancel stale requests
  - Prevent race conditions when filters change rapidly

### Step 4: Fix Infinite Loop Issue
- [x] Update `src/lib/useVehicles.ts`
  - Add `justUpdatedCacheRef` flag to track when we write to cache
  - Update cache listener to skip refetch when we just wrote to cache
  - This prevents the "reload reload reload" issue

### Step 5: Add Better Timeout Error Handling
- [x] Update `src/lib/api.ts`
  - Add specific handling for 504 Gateway Timeout
  - Improve retry logic for timeout errors

### Step 6: Test and Verify
- [x] Verify timeout configurations are consistent
- [x] Test with slow network conditions

## Summary of Changes

### Timeout Configuration Alignment
| Component | Before | After |
|-----------|--------|-------|
| Client-side (`api.ts`) | 60s | 60s (unchanged) |
| API Route wrapper (`route.ts`) | 30s | 60s |
| Handler internal (`route.ts`) | 45s | 45s (unchanged) |
| Database (`BaseService.ts`) | 30s | 45s |

### Key Improvements
1. **Consistent Timeouts**: All timeouts are now aligned to prevent premature timeouts
2. **Request Cancellation**: Added AbortController to cancel stale requests when filters change rapidly
3. **Fixed Infinite Loop**: Added `justUpdatedCacheRef` flag to prevent cache listener from triggering refetch after our own cache write
4. **Better Error Handling**: Added specific 504 Gateway Timeout handling with user-friendly messages
5. **Improved Retry Logic**: Timeout errors now get longer delays (2s base vs 1s) and higher max delay (8s vs 5s)

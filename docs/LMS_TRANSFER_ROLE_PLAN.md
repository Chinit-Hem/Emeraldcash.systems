# LMS Transfer Role Plan

## Task
Add a new "Transfer" role in LMS that can see ALL transfers (Admin + Sender + Receiver transfers).

## Current State
- LMS_ROLES = ["Admin", "Staff"]
- SMS transfer visibility (from `src/app/api/sms/transfers/route.ts`):
  - Admin: sees ALL transfers
  - Sender/Receiver: sees only their own transfers
- Users can only see transfers where they are sender OR receiver

## Plan

### 1. Update src/lib/lms-schema.ts
- Add "Transfer" to LMS_ROLES array

### 2. Update src/lib/types.ts
- Add "Transfer" role definition
- Add default permissions for Transfer role:
  - lms:view
  - sms:view
  - sms:transfer
  - users:view

### 3. Update src/app/api/sms/transfers/route.ts
- Modify canViewTransfer function to allow Transfer role to see ALL transfers

### 4. Files to Edit
1. `src/lib/lms-schema.ts` - Add Transfer to LMS_ROLES
2. `src/lib/types.ts` - Add Transfer role permissions
3. `src/app/api/sms/transfers/route.ts` - Allow Transfer role to see all transfers

## Dependent Files
- `src/app/api/lms/staff/route.ts` - Already handles roles dynamically

## Followup Steps
- Test the transfer dropdowns show all transfers for Transfer role

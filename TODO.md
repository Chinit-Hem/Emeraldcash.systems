# Folder Structure & Duplicate Code Cleanup TODO

## Step 1: Fix Database Circular Exports ✅
- [x] Remove `src/lib/db/db.ts` (circular re-export)
- [x] Remove `src/lib/db/index.ts` (circular re-export)
- [x] Remove `src/lib/db/db-singleton.ts` (circular re-export)
- [x] Remove empty `src/lib/db/` directory
- [x] `src/lib/db.ts` already correctly re-exports from `db-singleton.ts`

## Step 2: Consolidate Vehicle Form Hooks ✅
- [x] `useVehicleForm.ts` was only used for type re-export in `VehicleFormUnified.tsx`
- [x] `useVehicleFormNeon.ts` had zero imports — removed
- [x] Updated `VehicleFormUnified.tsx` to import `Vehicle` from `@/lib/types`
- [x] Removed legacy `src/lib/useVehicleForm.ts` and `src/app/components/vehicles/useVehicleFormNeon.ts`

## Step 3: Deduplicate Vehicle List Components
- [ ] Check if `VehiclesClient.tsx` is still used
- [ ] Check if `VehicleList.tsx` is still used
- [ ] Remove obsolete components if superseded by `VehiclesClientEnhanced.tsx`

## Step 4: Deduplicate Form Components
- [ ] Remove `VehicleFormNew.tsx` (zero imports found)
- [ ] Check overlap between `VehicleForm.tsx` and `VehicleFormUnified.tsx`
- [ ] Consolidate if possible

## Step 5: Remove Duplicate Global CSS
- [ ] Check which `globals.css` is actively imported in `layout.tsx`
- [ ] Remove the unused duplicate

## Step 6: Clean Unused UI Components
- [ ] Search for imports of `Liquid*` components
- [ ] Search for imports of `Neu*` components
- [ ] Remove unused design system folders

## Step 7: Reorganize `src/lib/`
- [ ] Move auth utilities to `src/lib/auth/`
- [ ] Move DB files to `src/lib/db/`
- [ ] Move general utilities to `src/lib/utils/`

## Verification
- [ ] Run `tsc --noEmit` after each step
- [ ] Run dev server to verify pages render correctly


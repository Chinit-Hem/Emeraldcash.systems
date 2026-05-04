# Form Loading Optimization - Steps to Make Forms Native-App Fast

## Plan Breakdown (Approved by User)
**Goal**: Reduce form load TTI from 300ms+ to <100ms with instant skeleton paint.

**Phase 1: Remove JS Blocking (Client Hooks/Services)**
- [ ] 1. Conditionalize all console.log in useVehicles.ts + VehicleService.ts
- [ ] 2. Async cache init in vehicleCache.ts/useVehicles.ts  
- [ ] 3. Create FormSuspenseWrapper.tsx with NeuVehicleFormSkeleton

**Phase 2: Data + UI Opts**
- [ ] 4. Static categories in VehicleFormUnified.tsx (no useVehicles dep)
- [ ] 5. Add Suspense to all form pages
- [ ] 6. Prefetch fix in vehicle list links

**Phase 3: Verify + Prod**
- [ ] 7. npm run build &amp;&amp; npm start → Perf tab test
- [ ] 8. Mark complete

**Progress Tracking**: Update this file after each step.

**Current Step**: 1/8 - Conditional logging


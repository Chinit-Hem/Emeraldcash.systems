# Accessibility & Inline Style Fix Plan

## Overview
This plan addresses the diagnostics from Microsoft Edge Tools showing:
1. TypeScript syntax errors (VehiclesClientEnhanced.tsx)
2. Accessibility issues - missing title attributes on buttons/selects/forms
3. Inline style warnings - need CSS file migration

---

## Phase 1: Critical TypeScript Errors (VehiclesClientEnhanced.tsx)

### Issue: Multiple parse errors at lines ~624, 732, 1711, 1858, 1948, 2354-2356
**Root cause**: Syntax errors likely from malformed JSX or unescaped characters

### Files to check:
- `src/app/(app)/vehicles/VehiclesClientEnhanced.tsx`

### Action:
1. Open file in editor and check lines with errors
2. Fix any missing brackets, parentheses, or JSX syntax issues
3. Verify file compiles without errors

---

## Phase 2: Accessibility Fixes (axe/name-role-value, axe/forms, axe/label)

### 2.1 Buttons Missing Accessible Names
**Fix**: Add `title` attribute to buttons

Files and line numbers:
- VehiclesClientEnhanced.tsx: 494, 532, 1662, 1716
- AssetFormModal.tsx: 175
- SettingsContent.tsx: 676, 826
- lms/lesson/[id]/page.tsx: 442
- lms/admin/staff/page.tsx: 435, 726
- lms/admin/lessons/page.tsx: 270, 316
- lms/admin/categories/page.tsx: 202, 233
- admin/staff/page.tsx: 288

**Code change**:
```tsx
// Before
<button onClick={...}>

// After
<button title="Action description" onClick={...}>
```

### 2.2 Selects Missing Accessible Names
**Fix**: Add `title` attribute to select elements

Files and line numbers:
- VehiclesClientEnhanced.tsx: 1573, 1622, 1727, 1741, 1822, 2255
- sms/transfer/page.tsx: 185, 232, 279
- sms/assets/page.tsx: 247
- SettingsContent.tsx: 493
- lms/admin/staff/page.tsx: 494
- lms/admin/lessons/page.tsx: 297, 350
- lms/admin/categories/page.tsx: 267

**Code change**:
```tsx
// Before
<select value={...}>

// After
<select title="Select option description" value={...}>
```

### 2.3 Form Elements Missing Labels
**Fix**: Add title attribute or label element

Files and line numbers:
- vehicles/[id]/view/page.tsx: 232 (input lacks title/placeholder)
- lms/admin/staff/page.tsx: 764
- lms/admin/lessons/page.tsx: 363, 387
- lms/admin/categories/page.tsx: 282
- SettingsContent.tsx: 866

**Code change**:
```tsx
// Before
<input type="text">

// After
<input title="Field description" type="text">
// OR
<label>Field Name<input type="text"></label>
```

---

## Phase 3: Inline Style Migration

### Issue: Inline style={{...}} should be moved to CSS/Tailwind classes

### Files with inline styles to migrate:

#### VehiclesClientEnhanced.tsx (5 instances)
- Line 378: `style={{ animationDelay: ... }}`
- Line 692: inline style
- Line 2040: `style={{ backgroundColor: ... }}`
- Line 2059: `style={{ backgroundColor: ... }}`
- Line 2153: inline style

**Migration approach**: Use Tailwind class or CSS module instead

```tsx
// Before
<div style={{ animationDelay: `${index * 100}ms` }}>

// After - Use CSS animation-delay via style prop is acceptable
// OR create utility class in globals.css
```

**Note**: Animation timing and dynamic color (backgroundColor from vehicle data) may need inline style. Consider:
1. Animation delays - acceptable as inline (dynamic values)
2. Color from data - acceptable as inline (runtime value)

#### Other files with inline styles:
- VehiclesClient.tsx: 91
- lms/course/[categoryId]/page.tsx: 369, 383
- vehicles/[id]/view/page.tsx: 319, 928, 1136
- sms/assets/components/AssetFormModal.tsx: 346
- lms/lesson/[id]/page.tsx: 599
- lms/admin/staff/page.tsx: 673
- admin/staff/page.tsx: 475

---

## Priority Order

1. **CRITICAL**: Fix TypeScript errors in VehiclesClientEnhanced.tsx (blocks build)
2. **HIGH**: Add title to buttons and selects (accessibility compliance)
3. **MEDIUM**: Add labels to form inputs (accessibility compliance)
4. **LOW**: Inline styles (webhint warnings - some acceptable for dynamic values)

---

## Files List

### TypeScript Fix:
- [ ] src/app/(app)/vehicles/VehiclesClientEnhanced.tsx

### Accessibility - Buttons:
- [ ] src/app/(app)/vehicles/VehiclesClientEnhanced.tsx
- [ ] src/app/(app)/sms/assets/components/AssetFormModal.tsx
- [ ] src/app/(app)/settings/SettingsContent.tsx
- [ ] src/app/(app)/lms/lesson/[id]/page.tsx
- [ ] src/app/(app)/lms/admin/staff/page.tsx
- [ ] src/app/(app)/lms/admin/lessons/page.tsx
- [ ] src/app/(app)/lms/admin/categories/page.tsx
- [ ] src/app/(app)/admin/staff/page.tsx

### Accessibility - Selects:
- [x] src/app/(app)/sms/transfer/page.tsx (FIXED: Added title to asset, sender, receiver selects)
- [ ] src/app/(app)/vehicles/VehiclesClientEnhanced.tsx
- [ ] src/app/(app)/sms/assets/page.tsx
- [ ] src/app/(app)/settings/SettingsContent.tsx
- [ ] src/app/(app)/lms/admin/staff/page.tsx
- [ ] src/app/(app)/lms/admin/lessons/page.tsx
- [ ] src/app/(app)/lms/admin/categories/page.tsx

### Accessibility - Forms:
- [ ] src/app/(app)/vehicles/[id]/view/page.tsx
- [ ] src/app/(app)/lms/admin/staff/page.tsx
- [ ] src/app/(app)/lms/admin/lessons/page.tsx
- [ ] src/app/(app)/lms/admin/categories/page.tsx
- [ ] src/app/(app)/settings/SettingsContent.tsx

### Inline Styles:
- [ ] Multiple files - evaluate case by case

## Notes on Inline Styles

Many inline styles in the codebase are for dynamic values that cannot be statically defined in CSS:
1. `animationDelay` - Runtime calculated values from index
2. `backgroundColor` - Dynamic vehicle color from database
3. `width` - Dynamic upload progress, table column widths

**These are valid use cases for inline styles and do NOT need migration** as they depend on runtime data.

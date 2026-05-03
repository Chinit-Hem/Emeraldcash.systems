# Upload Progress Tracking Implementation

## Overview
Added real-time upload progress tracking to provide better UX during image uploads with slow connections. Users can now see the current stage and progress percentage during multi-stage image upload operations.

## Changes Made

### 1. `useUpdateVehicleOptimistic.ts`
- Added `onProgress` callback to `UseUpdateVehicleOptimisticOptions` interface
- Added `reportProgress` helper function to emit progress updates
- Progress stages: 'compressing' | 'uploading' | 'processing' | 'saving'
- Progress values: 0-100 for each stage
- Progress calls at:
  - Compression start (0%) and end (100%)
  - Upload start (0%) and end (100%)
  - Processing (0% → 50% with 100ms delay)
  - Saving start (0%) and end (100%)

### 2. `VehiclesClient.tsx`
- Added `uploadProgress` state to track current progress
- Added `getProgressMessage` helper for human-readable messages
- Connected `onProgress` callback to `useUpdateVehicleOptimistic` hook
- Progress reset on success/error
- Pass `uploadProgress` to `VehicleModal`

### 3. `VehicleModal.tsx`
- Added `uploadProgress` prop to interface
- Pass `uploadProgress` to `VehicleForm`

### 4. `VehicleForm.tsx`
- Added `uploadProgress` prop to `VehicleFormProps` interface
- Destructure `uploadProgress` from props
- Added visual progress indicator in sticky footer:
  - Animated spinner icon
  - Current stage label (capitalized)
  - Progress bar with smooth transitions
  - Percentage display
- Updated submit button to show progress stage and percentage
- Disable submit/cancel buttons during upload
- Hide "unsaved changes" message during upload

## User Experience Flow

1. **Compression Stage**: "Compressing... 0-100%"
   - Client-side image compression for faster upload
   
2. **Uploading Stage**: "Uploading... 0-100%"
   - Direct upload to Cloudinary from browser
   
3. **Processing Stage**: "Processing... 0-50%"
   - Cloudinary processing the image
   
4. **Saving Stage**: "Saving... 0-100%"
   - API call to save vehicle data with Cloudinary URL

## Visual Design
- Blue color scheme for progress indicator (distinct from form errors/success)
- Smooth progress bar animations
- Spinning loader icon
- Clear stage labels
- Progress percentage display
- Button text updates to show current operation

## Benefits
- Users know the operation is progressing (no "frozen" feeling)
- Can estimate remaining time based on stage
- Better experience on slow connections
- Clear feedback for each step of the multi-stage process

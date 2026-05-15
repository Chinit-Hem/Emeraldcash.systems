# Continue Learning / Resume Logic Analysis

## Task: Check logic for "Continue Learning - Pick up where you left off"

---

## Current Implementation Summary

### 1. Dashboard - Finding the Current Lesson

**File:** `src/app/components/lms/LmsDashboard.tsx`

```typescript
const currentLesson = useMemo(() => lessons.find((l) => l.is_unlocked && !l.is_completed), [lessons]);
```

**Logic:**
- Finds FIRST lesson where `is_unlocked === true` AND `is_completed === false`
- Displays "Continue Learning" card with that lesson
- Click "Resume" navigates to `/lms/lesson/${lessonId}`

### 2. Video Player - Resuming Playback

**File:** `src/app/components/lms/VideoPlayer.tsx`

```typescript
// Load saved progress from API
const savedProgress = await fetch(`/api/lms/progress?lessonId=${lessonId}`);

// On player ready, seek to saved position
const resumeAt = Math.min(resumeTimeRef.current, Math.max(0, duration - 3));
if (resumeAt > 0) {
  event.target.seekTo(resumeAt, true);
}
```

**Auto-save logic:**
- Every 10 seconds (`PROGRESS_SAVE_INTERVAL_MS = 10_000`)
- On pause, visibility change, and before unload

---

## Data Flow

```
1. API: GET /api/lms/lessons?categoryId=X&sequential=true
   → Returns lessons with is_unlocked, is_completed flags

2. Dashboard: lesson.find(l => l.is_unlocked && !l.is_completed)
   → Shows first incomplete lesson as "Continue Learning"

3. API: GET /api/lms/progress?lessonId=Y
   → Returns { currentTimeSeconds, maxWatchedSeconds, durationSeconds }

4. VideoPlayer: seekTo(savedProgress.currentTimeSeconds)
   → Resumes playback at saved position
```

---

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /api/lms/lessons?sequential=true` | Get lessons with unlock/completion status |
| `GET /api/lms/progress?lessonId=X` | Get saved playback position |
| `POST /api/lms/progress` | Save progress (current time, max watched, etc.) |
| `POST /api/lms/completions` | Mark lesson as complete |

---

## Analysis Results

### ✅ Working Correctly

1. **Sequential Unlock:** Lessons only unlock after previous one is completed
2. **Progress Saving:** Current time, max watched, duration all saved to database
3. **Auto-seek:** Video automatically seeks to saved position on load
4. **Completion Threshold:** 95% watch required before marking complete

### ⚠️ Potential Improvements

1. **Show progress percentage:** The "Continue Learning" card doesn't show how much has been watched
2. **LastActivity sorting:** Could sort by `lastWatchedAt` to show most recently watched instead of first in sequence
3. **Time-based resume:** Could show "10 min remaining" estimate

---

## Code Locations

| File | Line | Function |
|------|------|----------|
| `src/app/components/lms/LmsDashboard.tsx` | ~305 | `currentLesson` useMemo |
| `src/app/components/lms/LmsDashboard.tsx` | ~385 | `handleResumeLesson` callback |
| `src/app/components/lms/VideoPlayer.tsx` | ~295 | `loadSavedProgress` useEffect |
| `src/app/components/lms/VideoPlayer.tsx` | ~315 | `resumeAt` calculation |
| `src/app/api/lms/progress/route.ts` | ~100 | GET handler |

---

## Conclusion

The "Continue Learning / Resume" feature is implemented correctly:

1. ✅ Dashboard shows next incomplete lesson (sequential order)
2. ✅ Video player saves progress every 10 seconds
3. ✅ On resume, video seeks to saved timestamp
4. ✅ Completion unlocks next lesson

**No logic bugs found.** The implementation follows standard sequential LMS patterns.

# LMS Lesson Visibility Troubleshooting Guide

## Common Issues & Solutions

### 1. **Lesson is_active = false**
Queries filter `WHERE is_active = true`. Check/update:
```sql
SELECT * FROM lms_lessons WHERE title LIKE '%your-lesson-title%' ;
UPDATE lms_lessons SET is_active = true WHERE id = YOUR_LESSON_ID;
```

### 2. **Wrong Category ID**
Lessons filtered by category_id. Verify:
```sql
SELECT id, name FROM lms_categories WHERE is_active = true;
```
Lesson must match category_id from above.

### 3. **Stale Cache**
API uses Vercel KV cache (5min TTL). Invalidate or wait:
- Browse /lms?cache-bust=1 or Ctrl+F5
- Cache cleared on create/update/delete (check network tab X-Cache: INVALIDATED)

### 4. **No LMS Page Loaded**
URLs:
- `/lms` - Dashboard (progress overview)
- `/lms/course/[categoryId]` - Lessons list (replace [categoryId] with actual ID e.g. /lms/course/1)
- `/lms/lesson/[lessonId]` - Individual lesson
- `/lms/admin/categories` - Admin (create/edit)

### 5. **Check Drizzle Studio**
1. Terminal: `y` for install → Drizzle Studio opens http://localhost:4983
2. Tables: `lms_lessons` (recent rows), `lms_categories` (IDs)
3. Screenshot recent lessons/categories

### 6. **API Test**
Browser console or curl:
```
fetch('/api/lms/categories').then(r=>r.json()).then(console.log)
fetch('/api/lms/lessons?categoryId=1&all=true').then(r=>r.json()).then(console.log)
```

### 7. **Admin Access**
Must be Admin role (confirmed ✓). Check session:
```
fetch('/api/auth/me').then(r=>r.json()).then(console.log)
```

## Quick Diagnostic Commands
```
# In Drizzle Studio SQL tab:
SELECT l.*, c.name as category_name 
FROM lms_lessons l 
JOIN lms_categories c ON l.category_id = c.id 
ORDER BY l.created_at DESC LIMIT 5;

# Check lesson count per category
SELECT c.name, COUNT(l.id) as lesson_count 
FROM lms_categories c 
LEFT JOIN lms_lessons l ON c.id = l.category_id AND l.is_active = true 
GROUP BY c.id, c.name;
```

## Next Steps
1. **Screenshot Drizzle Studio** lms_lessons recent 5 rows
2. **Browser Network tab** → /lms/course/1 → check API response
3. **Console errors** F12 → Console/Network → reload LMS page

**Paste outputs/screenshots here for precise diagnosis!**

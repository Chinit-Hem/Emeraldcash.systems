# LMS Test Data Guide

This guide explains how to use the new test data features for the LMS (Learning Management System).

## 🎯 What's New

### 1. "Fill Sample Data" Button (Development Mode)
A convenient button in the Add Lesson form that auto-fills all fields with realistic test data.

**How to use:**
1. Go to `/admin/lms` (Admin LMS page)
2. Click on a category (e.g., "Valuation")
3. Click "Add Lesson" button
4. Click the blue **"Fill Sample Data"** button at the top of the form
5. The form will auto-populate with:
   - Khmer/English bilingual titles
   - Detailed descriptions
   - YouTube URLs (with video ID extraction)
   - Step-by-step instructions in markdown
   - Duration and order index
6. Click "Create Lesson" to save

**Features:**
- Cycles through 4 different sample lessons
- Automatically selects the correct category based on lesson content
- Shows YouTube thumbnail preview
- Clears all validation errors
- Only visible in development mode (NODE_ENV=development)

### 2. Database Population Script
A TypeScript script that populates the entire LMS database with sample data via API calls.

**How to run:**
```bash
# Make sure your dev server is running first
npm run dev

# In another terminal, run the population script
npx ts-node scripts/populate-lms-data.ts
```

**What it creates:**
- 3 Categories: Valuation, System Training, Customer Service
- 4 Lessons with Khmer/English content:
  - Vehicle Valuation 101 (12 min)
  - Exterior Inspection & Paint (10 min)
  - VMS System Training (15 min)
  - Customer Negotiation Skills (20 min)
- 4 Staff members with different roles
- Random lesson completions for realistic dashboard data

## 📊 Sample Data Details

### Categories
| Name | Description | Icon | Color |
|------|-------------|------|-------|
| Valuation | Vehicle valuation techniques | Calculator | emerald |
| System Training | VMS platform usage | Monitor | blue |
| Customer Service | Customer interaction best practices | Users | purple |

### Lessons
| Title | Category | Duration | YouTube ID |
|-------|----------|----------|------------|
| Vehicle Valuation 101 | Valuation | 12 min | nt_Cc9YryN8 |
| Exterior Inspection | Valuation | 10 min | nt_Cc9YryN8 |
| VMS System Training | System Training | 15 min | dQw4w9WgXcQ |
| Customer Negotiation | Customer Service | 20 min | 5MgBikgcWnY |

### Staff Members
| Name | Role | Branch | Email |
|------|------|--------|-------|
| Sok Sambath | Appraiser | Phnom Penh Main | sambath@emeraldcash.com |
| Chan Sopheap | Sales | Phnom Penh Main | sopheap@emeraldcash.com |
| Vong Savath | Manager | Siem Reap Branch | savath@emeraldcash.com |
| Nak Sreynang | Trainee | Battambang Branch | sreynang@emeraldcash.com |

## 🔧 Files Created/Modified

### New Files
- `src/app/components/lms/LessonTestData.ts` - Sample data constants
- `scripts/populate-lms-data.ts` - Database population script
- `LMS_TEST_DATA_GUIDE.md` - This guide

### Modified Files
- `src/app/components/lms/AddLessonForm.tsx` - Added "Fill Sample Data" button

## 🚀 Quick Start for Testing

### Option 1: Quick UI Testing (Recommended for manual testing)
```bash
# 1. Start dev server
npm run dev

# 2. Open http://localhost:3000/admin/lms

# 3. Click "Add Lesson" → "Fill Sample Data" → "Create Lesson"

# 4. Repeat 3-4 times to populate all categories
```

### Option 2: Full Database Population (Recommended for dashboard testing)
```bash
# 1. Start dev server
npm run dev

# 2. In another terminal, run:
npx ts-node scripts/populate-lms-data.ts

# 3. Open http://localhost:3000/admin/lms to see populated dashboard
```

## 📝 Notes for Blackbox

Since Blackbox cannot view YouTube videos, here's the data summary to share:

```
Course: Vehicle Valuation 101
- Category: Valuation
- YouTube ID: nt_Cc9YryN8
- Duration: 12 minutes
- Target: Sales & Valuation Team
- Lessons: 1. Exterior Inspection, 2. Engine Diagnostics, 3. Market Pricing

The AddLessonForm now handles this data correctly and saves to the 'Valuation' category.
All API calls use relative paths (/api/lms/...) - no hardcoded IPs.
```

## 🎨 Dashboard Preview

After running the population script, you'll see:
- **Overview Tab**: Stats cards with total staff (4), categories (3), lessons (4), completion rate
- **Categories Tab**: 3 categories with lesson counts
- **Lessons Tab**: All 4 lessons with thumbnails
- **Staff Tab**: 4 staff members with roles and branches
- **Staff Progress**: Visual progress bars showing completion percentages

## 🔒 Security Notes

- The "Fill Sample Data" button only appears in development mode
- All API calls use relative paths (no hardcoded IPs)
- The script requires authentication (cookies must be set)
- Sample data uses realistic but fake email addresses

## 🐛 Troubleshooting

### "Fill Sample Data" button not showing
- Make sure `NODE_ENV=development` in your `.env.local`

### Script fails with 401 Unauthorized
- Log in to the app first (the script uses your session cookie)
- Make sure the dev server is running on the same port

### Categories not found
- The script auto-initializes LMS tables, but you can also visit `/admin/lms` first to trigger initialization

## 📞 Support

For issues or questions about the LMS test data features, refer to:
- `src/app/components/lms/LessonTestData.ts` for sample data structure
- `scripts/populate-lms-data.ts` for population logic
- `src/lib/lms-schema.ts` for database schema details

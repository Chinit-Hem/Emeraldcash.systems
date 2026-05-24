/**
 * LMS Test Data for Populating Add Lesson Form
 * 
 * Sample lessons for testing the LMS Dashboard with realistic data.
 * These match the categories defined in lms-schema.ts
 * 
 * @module LessonTestData
 */

import { LessonFormData } from "@/systems/lms/components/AddLessonForm";

// ============================================================================
// Sample Lesson Data (Khmer + English)
// ============================================================================

/**
 * Sample Lesson 1: Vehicle Valuation - Exterior Inspection
 * Category: Valuation
 */
export const SAMPLE_LESSON_1: Partial<LessonFormData> = {
  title: "ការពិនិត្យតួខ្លួន និងថ្នាំបាញ់ (Exterior Inspection & Paint)",
  description: "មេរៀននេះនឹងបង្រៀនអ្នកអំពីរបៀបត្រួតពិនិត្យស្ថានភាពតួខ្លួនរថយន្ត ការពិនិត្យថ្នាំបាញ់ និងការរកឃើញការជួសជុលដែលបានធ្វើពីមុន។",
  youtubeUrl: "https://youtu.be/nt_Cc9YryN8",
  youtubeVideoId: "nt_Cc9YryN8",
  stepByStepInstructions: `## ជំហានទី ១៖ ត្រួតពិនិត្យផ្នែកខាងក្រៅ (Exterior Check)
1. ពិនិត្យថ្នាំបាញ់ទាំងអស់ - រកមើលភាពខុសគ្នានៃពណ៌
2. ពិនិត្យរន្ធដៃ និងគម្លាតផ្នែកផ្សេងៗគ្នា
3. ពិនិត្យការបញ្ចាំងពន្លឺលើផ្ទៃថ្នាំបាញ់

## ជំហានទី ២៖ ពិនិត្យរយៈពេលប្រើប្រាស់ (Wear & Tear)
1. ពិនិត្យកង់ឡានទាំង ៤
2. ពិនិត្យថ្កល់មុខ និងថ្កល់ក្រោយ
3. ពិនិត្យកញ្ចក់ចំហៀង

## ជំហានទី ៣៖ កត់ត្រាលទ្ធផល
- សរសេរកំណត់ត្រាពីបញ្ហាដែលបានរកឃើញ
- ថតរូបភាពជាភស្តុតាង
- វាយតម្លៃថ្លៃជួសជុលប្រសិនបើមាន`,
  durationMinutes: 10,
  orderIndex: 1,
};

/**
 * Sample Lesson 2: System Training - VMS Platform
 * Category: System Training
 */
export const SAMPLE_LESSON_2: Partial<LessonFormData> = {
  title: "ការប្រើប្រាស់ប្រព័ន្ធ VMS ថ្មី (New VMS System Training)",
  description: "សិក្សាពីរបៀបប្រើប្រាស់ប្រព័ន្ធគ្រប់គ្រងរថយន្ត VMS ជំនាន់ថ្មី រួមមានការបញ្ចូលទិន្នន័យ ការស្វែងរក និងការបង្ហាញរបាយការណ៍។",
  youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  youtubeVideoId: "dQw4w9WgXcQ",
  stepByStepInstructions: `## ជំហានទី ១៖ ចូលប្រើប្រព័ន្ធ (Login)
1. បើកគេហទំព័រ VMS នៅលើ browser
2. បញ្ចូលឈ្មោះអ្នកប្រើប្រាស់ និងពាក្យសម្ងាត់
3. ចុចប៊ូតុង "ចូលប្រើ" (Login)

## ជំហានទី ២៖ បញ្ចូលរថយន្តថ្មី (Add Vehicle)
1. ចុចប៊ូតុង "+" ឬ "បន្ថែមរថយន្ត"
2. បំពេញព័ត៌មានរថយន្ត (ម៉ាក, ម៉ូដែល, ឆ្នាំ)
3. បញ្ចូលព័ត៌មានតម្លៃ និងទីតាំង
4. ផ្ទុកឡើងរូបភាពរថយន្ត
5. រក្សាទុក (Save)

## ជំហានទី ៣៖ ការស្វែងរក (Search)
1. ប្រើបារដែលស្វែងរកខាងលើ
2. ប្រើតម្រង (Filters) សម្រាប់ការស្វែងរកជាក់លាក់
3. រក្សាទុកតម្រងដែលប្រើញឹកញាប់

## ជំហានទី ៤៖ របាយការណ៍ (Reports)
1. ចូលទៅកាន់ផ្ទាំង Dashboard
2. ពិនិត្យស្ថិតិសង្ខេប
3. ទាញយករបាយការណ៍ Excel ប្រសិនបើត្រូវការ`,
  durationMinutes: 15,
  orderIndex: 2,
};

/**
 * Sample Lesson 3: Customer Service - Negotiation Skills
 * Category: Customer Service
 */
export const SAMPLE_LESSON_3: Partial<LessonFormData> = {
  title: "បច្ចេកទេសចរចាជាមួយអតិថិជន (Customer Negotiation Skills)",
  description: "រៀនពីវិធីសាស្រ្តចរចាតម្លៃជាមួយអតិថិជន ការដោះស្រាយការតវ៉ា និងការបង្កើតទំនាក់ទំនងយូរអង្វែង។",
  youtubeUrl: "https://www.youtube.com/watch?v=5MgBikgcWnY",
  youtubeVideoId: "5MgBikgcWnY",
  stepByStepInstructions: `## ជំហានទី ១៖ ការត្រៀមខ្លួន (Preparation)
1. សិក្សាពីតម្រូវការអតិថិជន
2. កំណត់តម្លៃអតិប្បរមា និងអប្បបរមា
3. ត្រៀមព័ត៌មានអំពីរថយន្តឱ្យបានល្អិតល្អន់

## ជំហានទី ២៖ ការស្តាប់ (Active Listening)
1. អនុញ្ញាតឱ្យអតិថិជននិយាយជាមុន
2. សួរសំណួរបើកចំហ (Open-ended questions)
3. បញ្ជាក់ថាអ្នកយល់ពីកង្វល់របស់ពួកគេ

## ជំហានទី ៣៖ ការបង្ហាញតម្លៃ (Presenting Price)
1. បង្ហាញតម្លៃដំបូងខ្ពស់ជាងបន្តិច
2. បកស្រាយពីតម្លៃដែលបានកំណត់
3. បង្ហាញអត្ថប្រយោជន៍នៃការទិញ

## ជំហានទី ៤៖ ការចរចា (Negotiation)
1. ផ្តល់ជម្រើសច្រើន (Multiple options)
2. ប្រើប្រាស់បច្ចេកទេស "Good Cop/Bad Cop"
3. ស្វែងរកចំណុចរួម (Win-win solution)

## ជំហានទី ៥៖ ការបិទកិច្ចសន្យា (Closing)
1. សង្ខេបការព្រមព្រៀង
2. បង្កើតអារម្មណ៍ភ្ញាក់ផ្អើលតូចៗ (Urgency)
3. សួរឱ្យចុះហត្ថលេខា/ដាក់ប្រាក់កក់`,
  durationMinutes: 20,
  orderIndex: 3,
};

/**
 * Main Course: Vehicle Valuation 101
 * Category: Valuation
 */
export const MAIN_COURSE_VALUATION: Partial<LessonFormData> = {
  title: "មូលដ្ឋានគ្រឹះនៃការវាយតម្លៃរថយន្ត (Vehicle Valuation 101)",
  description: "មេរៀននេះនឹងបង្រៀនអ្នកអំពីរបៀបត្រួតពិនិត្យ និងវាយតម្លៃស្ថានភាពរថយន្តជជុះ ការឆែកប្រវត្តិរថយន្ត និងការកំណត់តម្លៃទីផ្សារឱ្យបានត្រឹមត្រូវបំផុតសម្រាប់អតិថិជន។",
  youtubeUrl: "https://youtu.be/nt_Cc9YryN8",
  youtubeVideoId: "nt_Cc9YryN8",
  stepByStepInstructions: `## ជំហានទី ១៖ ការត្រួតពិនិត្យរថយន្តជជុះ (Vehicle Inspection)
1. ពិនិត្យតួខ្លួនខាងក្រៅ - រកមើលស្នាមខូច និងការជួសជុល
2. ពិនិត្យបន្ទប់ម៉ាស៊ីន - ស្តាប់សំឡេងម៉ាស៊ីន ពិនិត្យជ្រលក់ប្រេង
3. ពិនិត្យប្រព័ន្ធអគ្គិសនី - ពិនិត្យអំពូល និងប្រព័ន្ធឆ្នាំងភ្លើង
4. ពិនិត្យប្រព័ន្ធស្តេរិង - ពិនិត្យភាពរលូននៃការបើកបរ

## ជំហានទី ២៖ ការឆែកប្រវត្តិរថយន្ត (History Check)
1. ស្នើឯកសារកាន់កាប់ (Ownership documents)
2. ពិនិត្យប្រវត្តិសេវាកម្ម (Service history)
3. ពិនិត្យព័ត៌មានគ្រោះថ្នាក់ (Accident history)
4. ប្រើប្រាស់ប្រព័ន្ធពិនិត្យតាមអ៊ីនធឺណិត

## ជំហានទី ៣៖ ការកំណត់តម្លៃទីផ្សារ (Market Pricing)
1. ស្រាវជ្រាវតម្លៃទីផ្សារបច្ចុប្បន្ន
2. ប្រៀបធៀបជាមួយរថយន្តស្រដៀងគ្នា
3. គណនាការរំលោភ (Depreciation)
4. កំណត់តម្លៃដែលសមហេតុផល

## ជំហានទី ៤៖ ការបង្កើតរបាយការណ៍វាយតម្លៃ (Valuation Report)
- សរសេរសង្ខេបពីស្ថានភាពរថយន្ត
- បញ្ជាក់តម្លៃដែលបានណែនាំ
- ភ្ជាប់រូបភាព និងឯកសារគាំទ្រ`,
  durationMinutes: 12,
  orderIndex: 1,
};

// ============================================================================
// All Sample Lessons Array
// ============================================================================

export const ALL_SAMPLE_LESSONS = [
  MAIN_COURSE_VALUATION,
  SAMPLE_LESSON_1,
  SAMPLE_LESSON_2,
  SAMPLE_LESSON_3,
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get sample lesson by index
 */
export function getSampleLesson(index: number): Partial<LessonFormData> | null {
  return ALL_SAMPLE_LESSONS[index] || null;
}

/**
 * Get all sample lessons for a specific category
 */
export function getSampleLessonsByCategory(categoryName: string): Partial<LessonFormData>[] {
  const categoryMap: Record<string, number[]> = {
    "Valuation": [0, 1], // Main course + Exterior inspection
    "System Training": [2], // VMS training
    "Customer Service": [3], // Negotiation
  };
  
  const indices = categoryMap[categoryName] || [];
  return indices.map(i => ALL_SAMPLE_LESSONS[i]).filter(Boolean);
}

/**
 * Fill form data with sample lesson
 */
export function fillWithSampleData(
  sampleIndex: number,
  categoryId: number
): Partial<LessonFormData> | null {
  const sample = getSampleLesson(sampleIndex);
  if (!sample) return null;
  
  return {
    ...sample,
    categoryId,
  };
}

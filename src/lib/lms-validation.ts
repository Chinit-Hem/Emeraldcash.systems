import { z } from 'zod';

// LMS Form Validation Schemas

export const categorySchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Category name is required").max(50, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  icon: z.enum(["Calculator", "Monitor", "Users", "Shield", "TrendingUp", "Settings", "FileText", "Award", "HelpCircle", "BookOpen"]),
  color: z.enum(["emerald", "blue", "purple", "orange", "red", "pink", "cyan", "indigo"]),
  orderIndex: z.number().min(0),
});

export const lessonSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, "Title required").max(100, "Title too long"),
  description: z.string().max(500).optional(),
  categoryId: z.number().min(1, "Select category"),
  youtubeUrl: z.string().url("Valid YouTube URL").min(1),
  youtubeVideoId: z.string().length(11, "Invalid video ID"),
  stepByStepInstructions: z.string().optional(),
  durationMinutes: z.number().min(1).max(300).nullable(),
  orderIndex: z.number().min(0),
  isActive: z.boolean(),
  allowedRoles: z.array(z.enum(["Staff", "Accounting"])).optional(),
});

export const staffSchema = z.object({
  id: z.number().optional(),
  fullName: z.string().min(2, "Full name required").max(50),
  email: z.string().email("Valid email").or(z.literal("")).optional(),
  branchLocation: z.string().max(100).optional(),
  role: z.enum(["Admin", "Staff", "Accounting"]),
  phone: z.string().max(20).optional(),
  isActive: z.boolean(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
export type LessonFormData = z.infer<typeof lessonSchema>;
export type StaffFormData = z.infer<typeof staffSchema>;

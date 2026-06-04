import { z } from 'zod';

export const vehicleSchema = z.object({
  Brand: z.string().min(1, 'Brand is required').max(50),
  Model: z.string().min(1, 'Model is required').max(100),
  Category: z.enum(['Cars', 'Motorcycles', 'TukTuks'] as const, {
    message: 'Select a category: Cars, Motorcycles, or TukTuks'
  }),
  Plate: z.string().max(20, 'Plate too long'),
  Year: z.number().min(1900).max(new Date().getFullYear() + 2).nullable(),
  Color: z.string().min(1, 'Select a color'),

  Condition: z.string().min(1, 'Select condition'),

  BodyType: z.string().max(50).optional(),
  TaxType: z.string().min(1, 'Select tax type'),

  PriceNew: z.number().min(0).nullable(),
  Price40: z.number().min(0).nullable(),
  Price70: z.number().min(0).nullable(),
  Image: z.union([z.string().url(), z.literal('')]).optional(),
  Description: z.string().max(500).optional()
});

export type VehicleFormData = z.infer<typeof vehicleSchema>;

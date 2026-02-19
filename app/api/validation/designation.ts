import { z } from 'zod';

export const designationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().optional(),
  targetAmount: z.number().min(0, 'Target amount must be non-negative').optional(),
  currentAmount: z.number().min(0, 'Current amount must be non-negative').optional(),
  isActive: z.boolean().optional(),
  regionId: z.number().int().positive().optional(),
  universityId: z.number().int().positive().optional(),
  smallGroupId: z.number().int().positive().optional(),
});

export type DesignationInput = z.infer<typeof designationSchema>;
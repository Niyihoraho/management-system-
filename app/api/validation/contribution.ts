import { z } from 'zod';

export const contributorSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  studentId: z.number().int().positive().optional(),
  graduateId: z.number().int().positive().optional(),
});

export const contributionSchema = z.object({
  id: z.number().int().positive().optional(),
  contributor: contributorSchema,
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  method: z.enum(['mobile_money', 'bank_transfer', 'card', 'worldremit']),
  designationId: z.number().int().positive().optional(),
  status: z.enum(['pending', 'completed', 'failed', 'refunded', 'processing', 'cancelled']).optional(),
  transactionId: z.string().optional(),
  paymentTransactionId: z.number().int().positive().optional(),
  studentId: z.number().int().positive().optional(),
  graduateId: z.number().int().positive().optional(),
  // Additional fields for multi-step form
  userType: z.enum(['internal', 'external']),
  paymentMethod: z.string().optional(),
  paymentProvider: z.number().int().positive().optional(),
  currency: z.string().default('RWF'),
});

export const receiptSchema = z.object({
  id: z.number().int().positive().optional(),
  contributionId: z.number().int().positive(),
  receiptNumber: z.string(),
  pdfPath: z.string().optional(),
  emailSent: z.boolean().default(false),
  emailSentAt: z.date().optional(),
  smsSent: z.boolean().default(false),
  smsSentAt: z.date().optional(),
});

export type ContributorInput = z.infer<typeof contributorSchema>;
export type ContributionInput = z.infer<typeof contributionSchema>;
export type ReceiptInput = z.infer<typeof receiptSchema>;
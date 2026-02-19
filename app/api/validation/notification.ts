import { z } from "zod";

export const createNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  type: z.enum(["email", "sms", "in_app"], {
    errorMap: () => ({ message: "Type must be email, sms, or in_app" })
  }),
  subject: z.string().max(255, "Subject cannot exceed 255 characters").optional(),
  message: z.string().min(1, "Message is required").max(1000, "Message cannot exceed 1000 characters"),
  eventType: z.string().max(50, "Event type cannot exceed 50 characters").optional(),
  eventId: z.number().int().positive().optional(),
  metadata: z.string().optional(),
});

export const updateNotificationSchema = z.object({
  status: z.enum(["sent", "pending", "failed", "marked"]).optional(),
  readAt: z.string().optional().transform((val) => {
    if (!val || val === "") return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  }),
});

export const notificationPreferencesSchema = z.object({
  attendanceAlerts: z.boolean().default(true),
  eventReminders: z.boolean().default(true),
  inAppEnabled: z.boolean().default(true),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;

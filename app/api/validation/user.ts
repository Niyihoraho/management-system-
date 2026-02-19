import { z } from "zod";

export const createUserSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be at most 20 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
    contact: z.string().optional(),
    status: z.enum(["active", "inactive", "suspended"]).default("active"),
    role: z.object({
        scope: z.enum(["superadmin", "national", "region", "university", "smallgroup", "graduatesmallgroup"]),
        regionId: z.number().optional().nullable(),
        universityId: z.number().optional().nullable(),
        smallGroupId: z.number().optional().nullable(),
        graduateGroupId: z.number().optional().nullable(),
    }).optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export const updateUserSchema = z.object({
    id: z.string(),
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be at most 20 characters").optional(),
    email: z.string().email("Invalid email address").optional(),
    contact: z.string().optional(),
    status: z.enum(["active", "inactive", "suspended"]).optional(),
    role: z.object({
        scope: z.enum(["superadmin", "national", "region", "university", "smallgroup", "graduatesmallgroup"]),
        regionId: z.number().optional().nullable(),
        universityId: z.number().optional().nullable(),
        smallGroupId: z.number().optional().nullable(),
        graduateGroupId: z.number().optional().nullable(),
    }).optional(),
});

export const userRoleSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    scope: z.enum(["superadmin", "national", "region", "university", "smallgroup", "graduatesmallgroup"]),
    regionId: z.number().optional().nullable(),
    universityId: z.number().optional().nullable(),
    smallGroupId: z.number().optional().nullable(),
    graduateGroupId: z.number().optional().nullable(),
});

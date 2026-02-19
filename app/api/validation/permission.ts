import { z } from "zod";

export const createPermissionSchema = z.object({
    name: z.string().min(1, "Permission name is required").max(255, "Permission name cannot exceed 255 characters"),
    description: z.string().optional(),
    resource: z.string().min(1, "Resource is required").max(100, "Resource cannot exceed 100 characters"),
    action: z.string().min(1, "Action is required").max(50, "Action cannot exceed 50 characters"),
    scope: z.enum([
        "global",
        "regional", 
        "university",
        "smallgroup",
        "alumni_group",
        "personal"
    ]).default("global"),
    isActive: z.boolean().default(true),
});

export const updatePermissionSchema = z.object({
    id: z.number().int().positive(),
    name: z.string().min(1, "Permission name is required").max(255, "Permission name cannot exceed 255 characters"),
    description: z.string().optional(),
    resource: z.string().min(1, "Resource is required").max(100, "Resource cannot exceed 100 characters"),
    action: z.string().min(1, "Action is required").max(50, "Action cannot exceed 50 characters"),
    scope: z.enum([
        "global",
        "regional", 
        "university",
        "smallgroup",
        "alumni_group",
        "personal"
    ]).default("global"),
    isActive: z.boolean().default(true),
});

export const permissionQuerySchema = z.object({
    resource: z.string().optional(),
    action: z.string().optional(),
    scope: z.string().optional(),
    isActive: z.union([
        z.string().transform(val => val === 'true'),
        z.boolean()
    ]).optional(),
}); 
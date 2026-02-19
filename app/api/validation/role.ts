import { z } from "zod";

export const createRoleSchema = z.object({
    name: z.string().min(1, "Role name is required").max(255, "Role name cannot exceed 255 characters"),
    description: z.string().optional(),
    level: z.enum([
        "System",
        "National", 
        "Regional",
        "Campus",
        "SmallGroup",
        "GraduateNetwork",
        "Department"
    ]),
    isActive: z.boolean().default(true),
    isSystem: z.boolean().default(false),
});

export const updateRoleSchema = z.object({
    id: z.number().int().positive(),
    name: z.string().min(1, "Role name is required").max(255, "Role name cannot exceed 255 characters"),
    description: z.string().optional(),
    level: z.enum([
        "System",
        "National", 
        "Regional",
        "Campus",
        "SmallGroup",
        "GraduateNetwork",
        "Department"
    ]),
    isActive: z.boolean().default(true),
    isSystem: z.boolean().default(false),
});

export const roleQuerySchema = z.object({
    level: z.string().optional(),
    isActive: z.union([
        z.string().transform(val => val === 'true'),
        z.boolean()
    ]).optional(),
    includeUserCount: z.union([
        z.string().transform(val => val === 'true'),
        z.boolean()
    ]).optional(),
    includePermissions: z.union([
        z.string().transform(val => val === 'true'),
        z.boolean()
    ]).optional(),
}); 
import { z } from "zod";

export const createGraduateSchema = z.object({
    fullName: z.string().min(1, "Full name is required").max(255, "Full name cannot exceed 255 characters"),
    phone: z.string().max(20, "Phone cannot exceed 20 characters").optional().or(z.literal("")).or(z.null()),
    email: z.string().email("Invalid email").max(255).optional().or(z.literal("")).or(z.null()),
    university: z.string().max(255).optional().or(z.literal("")).or(z.null()),
    course: z.string().max(255).optional().or(z.literal("")).or(z.null()),
    graduationYear: z.union([
        z.string().transform((val) => {
            if (!val || val === "" || val === null) return null;
            const num = Number(val);
            return isNaN(num) ? null : num;
        }),
        z.number().int().min(1950).max(new Date().getFullYear()),
        z.null()
    ]).optional(),
    residenceProvince: z.string().max(255).optional().or(z.literal("")).or(z.null()),
    residenceDistrict: z.string().max(255).optional().or(z.literal("")).or(z.null()),
    residenceSector: z.string().max(255).optional().or(z.literal("")).or(z.null()),
    isDiaspora: z.union([
        z.boolean(),
        z.string().transform((val) => val === "true" || val === "1")
    ]).optional().default(false),
    servingPillars: z.union([
        z.array(z.string()),
        z.string().transform((val) => {
            if (!val || val === "" || val === null) return [];
            return val.split(",").map(s => s.trim()).filter(Boolean);
        })
    ]).optional().default([]),
    financialSupport: z.union([
        z.boolean(),
        z.string().transform((val) => val === "true" || val === "1")
    ]).optional().default(false),
    graduateGroupId: z.union([
        z.string().transform((val) => {
            if (!val || val === "" || val === null) return null;
            const num = Number(val);
            return isNaN(num) ? null : num;
        }),
        z.number().int().positive(),
    ]).refine((val) => val !== null, { message: "Graduate group is required" }),
    status: z.enum(["active", "inactive", "moved", "Active", "Inactive", "Moved"]).optional().default("active"),
    provinceId: z.union([
        z.string().transform((val) => {
            if (!val || val === "" || val === null) return null;
            const num = Number(val);
            return isNaN(num) ? null : num;
        }),
        z.number().int().positive(),
        z.bigint().transform(val => Number(val))
    ]).optional(),


});

export const updateGraduateSchema = createGraduateSchema.partial();

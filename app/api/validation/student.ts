import { z } from "zod";

export const createStudentSchema = z.object({
    fullName: z.string().min(1, "Full name is required").max(255, "Full name cannot exceed 255 characters"),
    phone: z.string().max(20, "Phone cannot exceed 20 characters").optional().or(z.literal("")).or(z.null()),
    email: z.string().email("Invalid email").max(255).optional().or(z.literal("")).or(z.null()),
    universityId: z.union([
        z.string().transform((val) => {
            if (!val || val === "" || val === null) return null;
            const num = Number(val);
            return isNaN(num) ? null : num;
        }),
        z.number().int().positive(),
    ]).refine((val) => val !== null, { message: "University is required" }),
    smallGroupId: z.union([
        z.string().transform((val) => {
            if (!val || val === "" || val === null) return null;
            const num = Number(val);
            return isNaN(num) ? null : num;
        }),
        z.number().int().positive(),
    ]).refine((val) => val !== null, { message: "Small group is required" }),
    course: z.string().max(255).optional().or(z.literal("")).or(z.null()),
    yearOfStudy: z.union([
        z.string().transform((val) => {
            if (!val || val === "" || val === null) return null;
            const num = Number(val);
            return isNaN(num) ? null : num;
        }),
        z.number().int().min(1).max(6),
        z.null()
    ]).optional(),
    placeOfBirthProvince: z.string().max(255).optional().or(z.literal("")).or(z.null()),
    placeOfBirthDistrict: z.string().max(255).optional().or(z.literal("")).or(z.null()),
    placeOfBirthSector: z.string().max(255).optional().or(z.literal("")).or(z.null()),
    status: z.enum(["active", "inactive", "mobilized", "alumning", "Active", "Inactive", "Mobilized", "Alumning"]).optional().transform(val => val?.toLowerCase() as "active" | "inactive" | "mobilized" | "alumning").default("active"),
    regionId: z.union([
        z.string().transform((val) => {
            if (!val || val === "" || val === null) return null;
            const num = Number(val);
            return isNaN(num) ? null : num;
        }),
        z.number().int().positive(),
    ]).optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

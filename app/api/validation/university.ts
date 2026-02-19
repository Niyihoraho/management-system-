import { z } from "zod";

export const createUniversitySchema = z.object({
    name: z.string().min(1, "University name is required").max(255, "University name cannot exceed 255 characters"),
    regionId: z.union([
        z.string().transform((val) => {
            if (!val || val === "" || val === null) return null;
            const num = Number(val);
            return isNaN(num) ? null : num;
        }),
        z.number().int().positive(),
    ]).refine((val) => val !== null, { message: "Region is required" }),
    studentPopulation: z.union([
        z.string().transform((val) => {
            if (!val || val === "" || val === null) return 0;
            const num = Number(val);
            return isNaN(num) ? 0 : num;
        }),
        z.number().int().nonnegative(),
    ]).optional().default(0),
    faculties: z.array(z.string()).optional().default([]),
    associations: z.array(z.string()).optional().default([]),
    cults: z.array(z.string()).optional().default([]),
}); 
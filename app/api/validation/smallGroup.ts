import { z } from "zod";

export const createSmallGroupSchema = z.object({
    name: z.string().min(1, "Small group name is required").max(255, "Small group name cannot exceed 255 characters"),
    universityId: z.union([
        z.string().transform((val) => {
            if (!val || val === "" || val === null) return null;
            const num = Number(val);
            return isNaN(num) ? null : num;
        }),
        z.number().int().positive(),
    ]).refine((val) => val !== null, { message: "University is required" }),
    regionId: z.union([
        z.string().transform((val) => {
            if (!val || val === "" || val === null) return null;
            const num = Number(val);
            return isNaN(num) ? null : num;
        }),
        z.number().int().positive(),
    ]).refine((val) => val !== null, { message: "Region is required" }),
}); 
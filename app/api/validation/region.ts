import { z } from "zod";

export const createRegionSchema = z.object({
    name: z.string().min(1, "Region name is required").max(255, "Region name cannot exceed 255 characters"),
}); 
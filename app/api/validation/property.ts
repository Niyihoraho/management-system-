import { z } from "zod";

export const createPropertySchema = z.object({
    kindOfProperty: z.enum([
        "musical_instruments",
        "books_for_reading",
        "secretarial_documents",
        "internal_regulations",
        "training_equipments",
        "beddings",
        "kitchen_equipments",
        "other_gbu_properties"
    ], {
        message: "Invalid property kind"
    }),
    nameOfProperty: z.string().min(1, "Property name is required"),
    numberOfProperties: z.union([
        z.string().transform((val) => {
            if (!val || val === "" || val === null) return 0;
            const num = Number(val);
            return isNaN(num) ? 0 : num;
        }),
        z.number().int().nonnegative(),
    ]).optional().default(0),
    propertiesFunctioning: z.union([
        z.string().transform((val) => {
            if (!val || val === "" || val === null) return 0;
            const num = Number(val);
            return isNaN(num) ? 0 : num;
        }),
        z.number().int().nonnegative(),
    ]).optional().default(0),
    propertiesNotFunctioning: z.union([
        z.string().transform((val) => {
            if (!val || val === "" || val === null) return 0;
            const num = Number(val);
            return isNaN(num) ? 0 : num;
        }),
        z.number().int().nonnegative(),
    ]).optional().default(0),
    whereKept: z.string().optional(),
    regionId: z.union([
        z.string().transform((val) => {
            if (!val || val === "" || val === null) return null;
            const num = Number(val);
            return isNaN(num) ? null : num;
        }),
        z.number().int().positive(),
    ]).refine((val) => val !== null, { message: "Region is required" }),
});

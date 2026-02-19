import { z } from "zod";

export const assignRoleSchema = z.object({
    userId: z.string(),
    scope: z.enum([
        "superadmin",
        "national",
        "region",
        "university",
        "smallgroup",
        "graduatesmallgroup"
    ]),
    regionId: z.number().optional(),
    universityId: z.number().optional(),
    smallGroupId: z.number().optional(),
    graduateGroupId: z.number().optional(),
}).refine((data) => {
    // Validate required fields for specific scopes
    if (data.scope === "region" && !data.regionId) return false;
    if (data.scope === "university" && (!data.universityId || !data.regionId)) return false; // Usually university belongs to region
    if (data.scope === "smallgroup" && (!data.smallGroupId || !data.universityId)) return false;
    if (data.scope === "graduatesmallgroup" && (!data.graduateGroupId || !data.regionId)) return false;

    return true;
}, {
    message: "Missing required location data for the selected role scope",
    path: ["scope"],
});

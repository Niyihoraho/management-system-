import { DefaultSession } from "next-auth";
import { RoleScope } from "@/lib/generated/prisma";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            username?: string | null;
            roles: {
                scope: RoleScope;
                regionId?: number | null;
                universityId?: number | null;
                smallGroupId?: number | null;
                graduateGroupId?: number | null;
                region?: { id: number; name: string } | null;
                university?: { id: number; name: string } | null;
                smallGroup?: { id: number; name: string } | null;
                graduateSmallGroup?: { id: number; name: string } | null;
            }[];
        } & DefaultSession["user"]
    }

    interface User {
        username?: string | null;
        roles: {
            scope: RoleScope;
            regionId?: number | null;
            universityId?: number | null;
            smallGroupId?: number | null;
            graduateGroupId?: number | null;
            region?: { id: number; name: string } | null;
            university?: { id: number; name: string } | null;
            smallGroup?: { id: number; name: string } | null;
            graduateSmallGroup?: { id: number; name: string } | null;
        }[];
    }
}

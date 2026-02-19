import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserScope } from "@/lib/rls";
import { createPropertySchema } from "../validation/property";
import { z } from "zod";

export async function GET(req: NextRequest) {
    try {
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only allow Superadmin, National, and Region roles
        if (['university', 'smallgroup', 'graduatesmallgroup'].includes(userScope.scope as string)) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const regionId = searchParams.get("regionId");

        let where: any = {};

        // Apply RLS
        if (userScope.scope === 'region' && userScope.regionId) {
            where.regionId = userScope.regionId;
        }

        // Apply filter if provided (and allowed)
        if (regionId) {
            const requestedRegionId = Number(regionId);
            // If user is restricted to a region, they can only query their own region
            if (userScope.scope === 'region' && userScope.regionId && userScope.regionId !== requestedRegionId) {
                return NextResponse.json({ error: "Access denied to requested region" }, { status: 403 });
            }
            where.regionId = requestedRegionId;
        }

        // Check if prisma.property exists (debugging step)
        if (!prisma.property) {
            console.error("CRITICAL ERROR: prisma.property is undefined");
            return NextResponse.json({ error: "Configuration Error", details: "Database model 'Property' is not loaded" }, { status: 500 });
        }

        // Fetch properties with region data
        console.log("Fetching properties with filter:", JSON.stringify(where));
        const properties = await prisma.property.findMany({
            where,
            include: {
                region: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        console.log(`Successfully fetched ${properties.length} properties`);
        return NextResponse.json(properties);
    } catch (error: any) {
        console.error("[PROPERTIES_GET]", error);
        return NextResponse.json({
            error: "Internal Error",
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        console.log("[PROPERTIES_POST] Starting request processing");
        const userScope = await getUserScope();
        if (!userScope) {
            console.warn("[PROPERTIES_POST] Unauthorized: No user scope");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        console.log("[PROPERTIES_POST] Request body:", JSON.stringify(body));

        // Validate request body
        const validation = createPropertySchema.safeParse(body);
        if (!validation.success) {
            const zodError = validation.error as any;
            console.warn("[PROPERTIES_POST] Validation failed:", JSON.stringify(zodError.errors));
            const errorMessage = zodError.errors?.map((e: any) => e.message).join(', ') || "Validation error";
            return NextResponse.json({ error: errorMessage, details: zodError.errors }, { status: 400 });
        }

        const {
            nameOfProperty,
            kindOfProperty,
            numberOfProperties,
            propertiesFunctioning,
            propertiesNotFunctioning,
            whereKept,
            regionId
        } = validation.data;

        // Permission check
        const requestedRegionId = Number(regionId);

        if (['university', 'smallgroup', 'graduatesmallgroup'].includes(userScope.scope as string)) {
            console.warn("[PROPERTIES_POST] Access denied: User scope too limited", userScope.scope);
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        if (userScope.scope === 'region' && userScope.regionId && userScope.regionId !== requestedRegionId) {
            console.warn("[PROPERTIES_POST] Access denied: Region mismatch", { userRegion: userScope.regionId, requestedRegion: requestedRegionId });
            return NextResponse.json({ error: "Access denied to create property in this region" }, { status: 403 });
        }

        // Verify region exists
        const region = await prisma.region.findUnique({
            where: { id: requestedRegionId }
        });

        if (!region) {
            console.warn("[PROPERTIES_POST] Region not found:", requestedRegionId);
            return NextResponse.json({ error: "Region not found" }, { status: 404 });
        }

        // Create property
        console.log("[PROPERTIES_POST] Creating property in database...");

        // Ensure prisma.property exists before calling it
        if (!prisma.property) {
            console.error("[PROPERTIES_POST] CRITICAL: prisma.property is undefined. Available models:", Object.keys(prisma).filter(k => !k.startsWith('_')));
            return NextResponse.json({ error: "Database configuration error: Property model not found" }, { status: 500 });
        }

        const property = await prisma.property.create({
            data: {
                nameOfProperty,
                kindOfProperty: kindOfProperty as any,
                numberOfProperties: numberOfProperties ?? 0,
                propertiesFunctioning: propertiesFunctioning ?? 0,
                propertiesNotFunctioning: propertiesNotFunctioning ?? 0,
                whereKept,
                regionId: requestedRegionId,
                updatedAt: new Date()
            }
        });

        console.log("[PROPERTIES_POST] Property created successfully:", property.id);
        return NextResponse.json(property);
    } catch (error: any) {
        console.error("[PROPERTIES_POST] Uncaught error:", error);
        return NextResponse.json({
            error: "Internal Error",
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Property ID is required" }, { status: 400 });
        }

        const propertyId = Number(id);

        // Check permissions
        if (['university', 'smallgroup', 'graduatesmallgroup'].includes(userScope.scope as string)) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Check if property exists and user has access
        const property = await prisma.property.findUnique({
            where: { id: propertyId }
        });

        if (!property) {
            return NextResponse.json({ error: "Property not found" }, { status: 404 });
        }

        // Region check for Region Admin
        if (userScope.scope === 'region' && userScope.regionId && property.regionId !== userScope.regionId) {
            return NextResponse.json({ error: "Access denied to delete property in this region" }, { status: 403 });
        }

        await prisma.property.delete({
            where: {
                id: propertyId
            }
        });

        return new NextResponse(null, { status: 200 });
    } catch (error) {
        console.error("[PROPERTIES_DELETE]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { id, ...data } = body;

        if (!id) {
            return NextResponse.json({ error: "Property ID is required" }, { status: 400 });
        }

        // Validate update data
        const validation = createPropertySchema.partial().safeParse(data);
        if (!validation.success) {
            const zodError = validation.error as any;
            const errorMessage = zodError.errors?.map((e: any) => e.message).join(', ') || "Validation error";
            return NextResponse.json({ error: errorMessage }, { status: 400 });
        }

        // Permission check
        if (['university', 'smallgroup', 'graduatesmallgroup'].includes(userScope.scope as string)) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const propertyId = Number(id);

        // Check existing property
        const existingProperty = await prisma.property.findUnique({
            where: { id: propertyId }
        });

        if (!existingProperty) {
            return NextResponse.json({ error: "Property not found" }, { status: 404 });
        }

        // Check write permission on existing property's region
        if (userScope.scope === 'region' && userScope.regionId && existingProperty.regionId !== userScope.regionId) {
            return NextResponse.json({ error: "Access denied to update property in this region" }, { status: 403 });
        }

        // If regionId is changing, check permission on new region
        if (validation.data.regionId) {
            const newRegionId = Number(validation.data.regionId);
            if (userScope.scope === 'region' && userScope.regionId && newRegionId !== userScope.regionId) {
                return NextResponse.json({ error: "Access denied to move property to this region" }, { status: 403 });
            }
        }

        const property = await prisma.property.update({
            where: {
                id: propertyId
            },
            data: {
                ...validation.data,
                kindOfProperty: validation.data.kindOfProperty as any,
                regionId: validation.data.regionId ? Number(validation.data.regionId) : undefined,
                updatedAt: new Date()
            }
        });

        return NextResponse.json(property);
    } catch (error) {
        console.error("[PROPERTIES_PUT]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

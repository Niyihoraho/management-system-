import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                userRole: {
                    include: {
                        region: true,
                        university: true,
                        smallGroup: true,
                        graduateSmallGroup: true,
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Check if user has a password (some users might be OAuth only)
        if (!user.password) {
            return NextResponse.json(
                { error: "Please use social login for this account" },
                { status: 401 }
            );
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }



        // Create JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                roles: (user.userRole ?? []).map((role: any) => ({
                    scope: role.scope,
                    regionId: role.regionId,
                    universityId: role.universityId,
                    smallGroupId: role.smallGroupId,
                    graduateGroupId: role.graduateGroupId,
                }))
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '24h' }
        );

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        return NextResponse.json({
            user: userWithoutPassword,
            token,
            message: "Login successful"
        }, { status: 200 });

    } catch (error: any) {
        console.error("Error during login:", error);
        return NextResponse.json(
            { error: "Login failed", details: error.message },
            { status: 500 }
        );
    }
}



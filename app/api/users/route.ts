import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createUserSchema } from "../validation/user";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validation = createUserSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.issues },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: data.email },
                    { username: data.username }
                ]
            }
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "User with this email or username already exists" },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 12);

        // Generate unique ID
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const newUser = await prisma.user.create({
            data: {
                id: userId,
                name: data.name,
                username: data.username,
                email: data.email,
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        // Remove password from response
        const { password: _, ...userWithoutPassword } = newUser;

        return NextResponse.json(userWithoutPassword, { status: 201 });
    } catch (error: unknown) {
        console.error("Error creating user:", error);
        return NextResponse.json(
            { error: "Failed to create user", details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const search = searchParams.get("search") || "";

        // If ID is provided, return specific user
        if (id) {
            const user = await prisma.user.findUnique({
                where: { id },
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
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            // Remove password from response
            const { password: _, ...userWithoutPassword } = user;
            return NextResponse.json(userWithoutPassword, { status: 200 });
        }

        // Build search conditions
        const where: Record<string, unknown> = {};
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { username: { contains: search } },
            ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Fetch users with pagination
        const [users, totalCount] = await Promise.all([
            prisma.user.findMany({
                where,
                include: {
                    userRole: {
                        include: {
                            region: true,
                            university: true,
                            smallGroup: true,
                            graduateSmallGroup: true,
                        }
                    }
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where })
        ]);

        // Remove passwords from response
        const usersWithoutPasswords = users.map(({ password: _, ...user }) => user);

        return NextResponse.json({
            users: usersWithoutPasswords,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        }, { status: 200 });
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json(
            { error: "Failed to fetch users", details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id }
        });

        if (!existingUser) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Hash password if provided
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 12);
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                ...updateData,
                updatedAt: new Date(),
            },
        });

        // Remove password from response
        const { password: _, ...userWithoutPassword } = updatedUser;

        return NextResponse.json(userWithoutPassword, { status: 200 });
    } catch (error: unknown) {
        console.error("Error updating user:", error);
        return NextResponse.json(
            { error: "Failed to update user", details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id }
        });

        if (!existingUser) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Delete user (this will cascade delete related records due to foreign key constraints)
        await prisma.user.delete({
            where: { id }
        });

        return NextResponse.json(
            { message: "User deleted successfully" },
            { status: 200 }
        );
    } catch (error: unknown) {
        console.error("Error deleting user:", error);
        return NextResponse.json(
            { error: "Failed to delete user", details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}



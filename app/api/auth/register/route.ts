import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUserSchema } from "../../validation/user";

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

        return NextResponse.json({
            user: userWithoutPassword,
            message: "User registered successfully"
        }, { status: 201 });

    } catch (error: unknown) {
        console.error("Error during registration:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: "Registration failed", details: errorMessage },
            { status: 500 }
        );
    }
}



import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
    id: z.number(),
    supportStatus: z.enum(['want_to_support', 'already_supporting', 'later']).nullable().optional(),
    supportFrequency: z.enum(['monthly', 'half_year', 'full_year']).nullable().optional(),
    supportAmount: z.string().nullable().optional(),
    enableReminder: z.boolean().optional(),
});

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const result = updateSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid data', details: result.error.format() },
                { status: 400 }
            );
        }

        const { id, ...updateData } = result.data;

        const updatedGraduate = await prisma.graduate.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(updatedGraduate);
    } catch (error: any) {
        console.error('Error updating financial details:', error);
        return NextResponse.json(
            { error: 'Failed to update financial details' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from "next/server";
import { runDataValidation, ValidationOptions } from "@/lib/data-validation";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        
        // Parse validation options from query parameters
        const options: ValidationOptions = {
            checkDataIntegrity: searchParams.get('checkDataIntegrity') === 'true',
            checkRLS: searchParams.get('checkRLS') === 'true',
            checkPerformance: searchParams.get('checkPerformance') === 'true',
            checkConsistency: searchParams.get('checkConsistency') === 'true'
        };

        // If no specific options provided, run all checks
        if (!Object.values(options).some(Boolean)) {
            options.checkDataIntegrity = true;
            options.checkRLS = true;
            options.checkPerformance = true;
            options.checkConsistency = true;
        }

        console.log('🔍 Running data validation with options:', options);

        const validationResult = await runDataValidation(options);

        return NextResponse.json({
            success: true,
            validation: validationResult,
            timestamp: new Date().toISOString()
        }, { status: 200 });

    } catch (error) {
        console.error("Error running data validation:", error);
        return NextResponse.json({ 
            success: false,
            error: 'Failed to run data validation',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const options: ValidationOptions = body.options || {};

        console.log('🔍 Running data validation with POST options:', options);

        const validationResult = await runDataValidation(options);

        return NextResponse.json({
            success: true,
            validation: validationResult,
            timestamp: new Date().toISOString()
        }, { status: 200 });

    } catch (error) {
        console.error("Error running data validation:", error);
        return NextResponse.json({ 
            success: false,
            error: 'Failed to run data validation',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}


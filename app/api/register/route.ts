import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import {
  checkPhoneNumber,
  checkEmailAddress,
  normalizePhoneNumber,
} from "@/lib/services/registration";
import { registrationSchema } from "../validation/registration";
import { RegistrationRequestType, RegistrationStatus } from "@/lib/generated/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registrationSchema.parse(body);

    const phoneCheck = await checkPhoneNumber(parsed.phone);
    if (phoneCheck) {
      return NextResponse.json(
        { error: "phone_in_use", details: `Phone already used by ${phoneCheck.source}` },
        { status: 409 }
      );
    }

    const emailCheck = await checkEmailAddress(parsed.email);
    if (emailCheck) {
      return NextResponse.json(
        { error: "email_in_use", details: `Email already used by ${emailCheck.source}` },
        { status: 409 }
      );
    }

    const normalizedPhone = normalizePhoneNumber(parsed.phone);
    const normalizedEmail = parsed.email ?? null;
    const record = await prisma.registrationrequest.create({
      data: {
        type:
          parsed.type === "student"
            ? RegistrationRequestType.student
            : RegistrationRequestType.graduate,
        status: RegistrationStatus.PENDING,
        payload: parsed,
        fullName: parsed.fullName,
        phone: normalizedPhone,
        email: normalizedEmail,
        updatedAt: new Date(),
      },
      select: { id: true, status: true },
    });

    return NextResponse.json(
      {
        message: "Registration request received",
        requestId: record.id,
        status: record.status,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "validation_error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Registration error", error);
    return NextResponse.json(
      { error: "registration_failed", details: "Unable to process request" },
      { status: 500 }
    );
  }
}

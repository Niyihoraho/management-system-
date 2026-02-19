import { prisma } from "@/lib/prisma";
import { RegistrationStatus } from "@/lib/generated/prisma";

type ContactCheckResult = {
  exists: boolean;
  source: "student" | "graduate" | "registration";
};

export const normalizePhoneNumber = (phone: string) => phone.replace(/[^+\d]/g, "").trim();

export async function checkPhoneNumber(rawPhone?: string | null): Promise<ContactCheckResult | null> {
  if (!rawPhone) return null;
  const phone = normalizePhoneNumber(rawPhone);

  const [student, graduate, registration] = await Promise.all([
    prisma.student.findFirst({ where: { phone } }),
    prisma.graduate.findFirst({ where: { phone } }),
    prisma.registrationrequest.findFirst({
      where: {
        phone,
        status: { in: [RegistrationStatus.PENDING, RegistrationStatus.APPROVED] },
      },
    }),
  ]);

  if (student) return { exists: true, source: "student" };
  if (graduate) return { exists: true, source: "graduate" };
  if (registration) return { exists: true, source: "registration" };
  return null;
}

export async function checkEmailAddress(email?: string | null): Promise<ContactCheckResult | null> {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();

  const [student, graduate, registration] = await Promise.all([
    prisma.student.findFirst({ where: { email: trimmed } }),
    prisma.graduate.findFirst({ where: { email: trimmed } }),
    prisma.registrationrequest.findFirst({
      where: {
        email: trimmed,
        status: { in: [RegistrationStatus.PENDING, RegistrationStatus.APPROVED] },
      },
    }),
  ]);

  if (student) return { exists: true, source: "student" };
  if (graduate) return { exists: true, source: "graduate" };
  if (registration) return { exists: true, source: "registration" };
  return null;
}

export function generateRegistrationToken(seed?: string | null) {
  const slugBase = seed
    ? seed
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32)
    : "applicant";
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${slugBase || "applicant"}-${Date.now().toString(36)}-${randomPart}`;
}

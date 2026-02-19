import { z } from "zod";

const optionalTextField = (max = 255) =>
  z
    .union([z.string().max(max), z.literal(""), z.null(), z.undefined()])
    .transform((val) => {
      if (typeof val !== "string") return undefined;
      const trimmed = val.trim();
      return trimmed.length ? trimmed : undefined;
    })
    .optional();

const requiredTextField = (label: string, max = 255) =>
  z
    .string()
    .min(1, `${label} is required`)
    .max(max, `${label} is too long`)
    .transform((val) => val.trim());

const phoneField = z
  .string()
  .min(8, "Phone number must be at least 8 characters")
  .max(20, "Phone number is too long")
  .transform((val) => val.trim());

const emailField = z
  .union([z.string().email("Invalid email").max(255), z.literal(""), z.null(), z.undefined()])
  .transform((val) => {
    if (typeof val !== "string") return undefined;
    const trimmed = val.trim();
    return trimmed.length ? trimmed.toLowerCase() : undefined;
  })
  .optional();

const contactSchema = z.object({
  fullName: requiredTextField("Full name"),
  phone: phoneField,
  email: emailField,
});

export const identitySchema = contactSchema.extend({
  type: z.enum(["student", "graduate"]),
});

export const studentDetailsSchema = z.object({
  university: requiredTextField("University / Campus"),
  course: optionalTextField(),
  yearOfStudy: optionalTextField(),
  smallGroup: requiredTextField("Small group"),
  ministryFocus: optionalTextField(500),
  servingPillars: z.array(z.string()).default([]),
});

export const studentLocationSchema = z.object({
  province: requiredTextField("Province"),
  district: requiredTextField("District"),
  sector: requiredTextField("Sector"),
  cell: requiredTextField("Cell"),
  village: requiredTextField("Village"),
});

export const graduateDetailsSchema = z.object({
  university: optionalTextField(),
  course: optionalTextField(),
  graduationYear: optionalTextField(4),
  ministryFocus: optionalTextField(500),
  servingPillars: z.array(z.string()).default([]),
  isDiaspora: z.boolean().default(false),
});

export const graduateResidenceSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("rwanda"),
    province: requiredTextField("Province"),
    district: requiredTextField("District"),
    sector: requiredTextField("Sector"),
  }),
  z.object({
    mode: z.literal("diaspora"),
    country: requiredTextField("Country"),
  }),
]);

export const studentRegistrationSchema = contactSchema
  .extend({ type: z.literal("student") })
  .merge(studentDetailsSchema)
  .extend({
    location: studentLocationSchema,
  });

export const graduateRegistrationSchema = contactSchema
  .extend({ type: z.literal("graduate") })
  .merge(graduateDetailsSchema)
  .extend({
    residence: graduateResidenceSchema,
  });

export const registrationSchema = z.discriminatedUnion("type", [
  studentRegistrationSchema,
  graduateRegistrationSchema,
]);

export type RegistrationPayload = z.infer<typeof registrationSchema>;

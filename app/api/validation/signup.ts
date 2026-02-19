import z from "zod";

export const signupSchema = z.object({
    name: z.string().min(4,"Name must be at least 4 characters" ),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string()
})
.refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })

  export type signupInput = z.infer<typeof signupSchema>
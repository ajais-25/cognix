import z from "zod";

export const forgotPasswordSchema = z.object({
  email: z.email("Please provide a valid email address"),
});

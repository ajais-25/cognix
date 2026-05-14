import { z } from "zod";

export const signInSchema = z.object({
  email: z.email({ error: "Invalid email address" }),
  password: z
    .string()
    .min(6, { error: "Password must be atleast 6 characters" }),
});

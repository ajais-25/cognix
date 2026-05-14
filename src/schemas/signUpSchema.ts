import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string(),
  email: z.email({ error: "Invalid email address" }),
  password: z
    .string()
    .min(6, { error: "Password must be atleast 6 characters" }),
});

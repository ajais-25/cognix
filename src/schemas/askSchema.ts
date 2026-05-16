import { z } from "zod";

export const askSchema = z.object({
  query: z.string().min(1, "Query is required"),
});

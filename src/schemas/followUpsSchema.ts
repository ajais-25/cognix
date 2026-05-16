import { z } from "zod";

export const followUpsSchema = z.object({
  followUps: z
    .array(
      z
        .string()
        .describe(
          "A follow up question to ask the user to get more clarity or information",
        ),
    )
    .describe("A list of 3-4 follow up questions based on the answer"),
});

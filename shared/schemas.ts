import { z } from "zod";

export const NameSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export type NameInput = z.infer<typeof NameSchema>;

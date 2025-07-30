import { z } from "zod";

export const stlRequestBodySchema = z.object({
  code: z.string().min(1, "JSCAD code is required"),
});

export type StlRequestBody = z.infer<typeof stlRequestBodySchema>; 
import { z } from "zod";

export const homeQuerySchema = z.object({
  tenant_id: z.string().min(1),
});

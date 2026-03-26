import { z } from "zod";

export const pricingSchema = z.object({
  tenant_id: z.string().min(1),
});

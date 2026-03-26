import { z } from "zod";

export const inventoryTenantSchema = z.object({
  tenant_id: z.string().min(1),
});

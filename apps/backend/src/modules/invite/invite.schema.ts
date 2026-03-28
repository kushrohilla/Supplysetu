import { z } from "zod";

export const inviteTokenParamsSchema = z.object({
  token: z.string().trim().min(1),
});

export const acceptInviteSchema = z.object({
  token: z.string().trim().min(1),
});

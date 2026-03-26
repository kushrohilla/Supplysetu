import { z } from "zod";

export const requestOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/),
  otp: z.string().regex(/^\d{4,6}$/),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  locality: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  owner_name: z.string().optional(),
});

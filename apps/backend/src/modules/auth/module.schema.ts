import { z } from "zod";

export const requestOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/),
});

export const adminLoginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(6),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/),
  otp: z.string().regex(/^\d{4,6}$/),
});

export const registerDistributorSchema = z.object({
  distributor_name: z.string().trim().min(2),
  owner_name: z.string().trim().min(2),
  mobile_number: z.string().trim().regex(/^\d{10}$/),
  gst_number: z.string().trim().min(5),
  full_address: z.string().trim().min(10),
  password: z.string().min(6),
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

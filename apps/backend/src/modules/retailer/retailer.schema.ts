import { z } from "zod";

const optionalText = z.string().trim().min(1).optional();

export const retailerParamsSchema = z.object({
  id: z.string().min(1),
});

export const createRetailerSchema = z.object({
  name: z.string().trim().min(1),
  owner_name: optionalText,
  mobile_number: z.string().trim().min(1),
  gst_number: optionalText,
  address_line1: optionalText,
  city: optionalText,
  state: optionalText,
  pincode: optionalText,
}).strict();

export const updateRetailerSchema = z.object({
  name: z.string().trim().min(1).optional(),
  owner_name: optionalText,
  mobile_number: z.string().trim().min(1).optional(),
  gst_number: optionalText,
  address_line1: optionalText,
  city: optionalText,
  state: optionalText,
  pincode: optionalText,
}).strict().refine((payload) => Object.keys(payload).length > 0, {
  message: "At least one field must be provided",
});

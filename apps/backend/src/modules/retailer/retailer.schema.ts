import { z } from "zod";

const optionalText = z.string().trim().min(1).optional();
const paginationNumber = z.coerce.number().int().positive();

export const retailerParamsSchema = z.object({
  id: z.string().min(1),
});

export const adminRetailersQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: paginationNumber.default(1),
  limit: paginationNumber.max(100).default(10),
}).strict();

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

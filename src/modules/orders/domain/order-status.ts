export const orderStatuses = [
  "DRAFT",
  "PLACED",
  "CONFIRMED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

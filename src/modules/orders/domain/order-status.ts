export const orderStatuses = [
  "pending_approval",
  "approved_for_export",
  "invoiced",
  "dispatched",
  "delivered",
  "closed",
  "cancelled"
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

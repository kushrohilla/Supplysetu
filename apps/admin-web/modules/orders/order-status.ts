import type { OrderStatus } from "@/types/order";

export const getAllowedNextStatuses = (status: OrderStatus): OrderStatus[] => {
  switch (status) {
    case "DRAFT":
      return ["PLACED", "CONFIRMED", "CANCELLED"];
    case "PLACED":
      return ["CONFIRMED", "CANCELLED"];
    case "CONFIRMED":
      return ["CANCELLED"];
    case "CANCELLED":
      return [];
    default:
      return [];
  }
};

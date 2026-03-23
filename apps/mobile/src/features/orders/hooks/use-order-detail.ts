import { useQuery } from "@tanstack/react-query";

import { ordersApi } from "../api/orders-api";

export const useOrderDetail = (orderId: string) => {
  return useQuery({
    queryKey: ["retailer-order", orderId],
    queryFn: () => ordersApi.getOrder(orderId),
    enabled: Boolean(orderId),
    staleTime: 60_000
  });
};

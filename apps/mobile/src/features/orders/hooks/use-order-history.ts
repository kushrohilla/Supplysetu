import { useQuery } from "@tanstack/react-query";

import { ordersApi } from "../api/orders-api";

export const useOrderHistory = () => {
  return useQuery({
    queryKey: ["retailer-orders"],
    queryFn: () => ordersApi.listOrders(),
    staleTime: 60_000
  });
};

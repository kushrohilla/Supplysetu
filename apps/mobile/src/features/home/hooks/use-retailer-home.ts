import { useQuery } from "@tanstack/react-query";

import { homeApi } from "../api/home-api";

export const useRetailerHome = () => {
  return useQuery({
    queryKey: ["retailer-home"],
    queryFn: () => homeApi.getRetailerHome(),
    staleTime: 60_000
  });
};

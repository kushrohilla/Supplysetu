import { useQuery } from "@tanstack/react-query";

import { catalogueApi } from "../api/catalogue-api";

export const useCatalogueBrands = () => {
  return useQuery({
    queryKey: ["catalogue-brands"],
    queryFn: () => catalogueApi.getBrands(),
    staleTime: 5 * 60_000
  });
};

import { useInfiniteQuery } from "@tanstack/react-query";

import { catalogueApi } from "../api/catalogue-api";

export const usePaginatedProducts = (params: { brandId?: string; search?: string }) => {
  return useInfiniteQuery({
    queryKey: ["catalogue-products", params.brandId ?? "all", params.search ?? ""],
    queryFn: ({ pageParam }) =>
      catalogueApi.getProducts({
        brandId: params.brandId,
        search: params.search,
        page: pageParam
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 60_000
  });
};

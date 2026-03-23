import { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "@/features/auth/state/auth-context";
import { EngagementProvider } from "@/features/engagement/state/engagement-context";
import { CartProvider } from "@/features/ordering/state/cart-context";
import { GlobalErrorBoundary } from "@/shared/components/errors/global-error-boundary";
import { ThemeProvider } from "@/shared/theme/theme-context";
import { queryClient } from "@/shared/query/query-client";

export const AppProviders = ({ children }: PropsWithChildren) => {
  return (
    <GlobalErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <EngagementProvider>
              <CartProvider>{children}</CartProvider>
            </EngagementProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  );
};

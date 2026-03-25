import { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "@/features/auth/state/auth-context";
import { EngagementProvider } from "@/features/engagement/state/engagement-context";
import { InviteDeepLinkHandler } from "@/features/network/components/invite-deep-link-handler";
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
            <InviteDeepLinkHandler />
            <EngagementProvider>
              <CartProvider>{children}</CartProvider>
            </EngagementProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  );
};

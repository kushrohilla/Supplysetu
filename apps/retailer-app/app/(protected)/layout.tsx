"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CartProvider, useCart } from "@/components/cart/CartProvider";
import { AppShell } from "@/components/layout/AppShell";

function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { itemCount } = useCart();

  return <AppShell itemCount={itemCount}>{children}</AppShell>;
}

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute mode="selected">
      <CartProvider>
        <ProtectedShell>{children}</ProtectedShell>
      </CartProvider>
    </ProtectedRoute>
  );
}

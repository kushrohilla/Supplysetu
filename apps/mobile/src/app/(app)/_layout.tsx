import { Redirect, Stack } from "expo-router";

import { useAuthSession } from "@/features/auth/state/auth-context";

export default function RetailerAppLayout() {
  const { status, isAuthenticated } = useAuthSession();

  if (status === "bootstrapping") {
    return <Redirect href="/bootstrap" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

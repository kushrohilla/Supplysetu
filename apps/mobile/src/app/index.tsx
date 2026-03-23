import { Redirect } from "expo-router";

import { useAuthSession } from "@/features/auth/state/auth-context";

export default function IndexScreen() {
  const { status, isAuthenticated } = useAuthSession();

  if (status === "bootstrapping") {
    return <Redirect href="/bootstrap" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return <Redirect href="/(app)" />;
}

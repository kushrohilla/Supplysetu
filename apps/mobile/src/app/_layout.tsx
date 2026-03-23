import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppProviders } from "@/bootstrap/app-providers";
import { useAppBootstrap } from "@/bootstrap/use-app-bootstrap";

export default function RootLayout() {
  const ready = useAppBootstrap();

  if (!ready) {
    return null;
  }

  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade"
        }}
      />
    </AppProviders>
  );
}

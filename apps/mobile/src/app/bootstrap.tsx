import { Redirect } from "expo-router";
import { View } from "react-native";

import { useAuthSession } from "@/features/auth/state/auth-context";
import { AppText } from "@/shared/components/ui/app-text";
import { FullScreenLoader } from "@/shared/components/loading/full-screen-loader";
import { useTheme } from "@/shared/theme/theme-context";

export default function BootstrapScreen() {
  const { theme } = useTheme();
  const { status, isAuthenticated } = useAuthSession();

  if (status !== "bootstrapping") {
    return <Redirect href={isAuthenticated ? "/(app)" : "/(auth)/welcome"} />;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: theme.spacing.lg
      }}
    >
      <FullScreenLoader label="Preparing SupplySetu" />
      <AppText
        variant="body"
        style={{
          marginTop: theme.spacing.md,
          textAlign: "center",
          color: theme.colors.textMuted
        }}
      >
        Optimised for low bandwidth retailer ordering.
      </AppText>
    </View>
  );
}

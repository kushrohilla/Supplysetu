import { useLocalSearchParams, router } from "expo-router";
import { View } from "react-native";

import { AppButton } from "@/shared/components/ui/app-button";
import { AppText } from "@/shared/components/ui/app-text";
import { ScreenContainer } from "@/shared/components/ui/screen-container";
import { useTheme } from "@/shared/theme/theme-context";

export default function JoinConfirmationScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{
    distributorName?: string;
    code?: string;
  }>();

  return (
    <ScreenContainer>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          gap: theme.spacing.md
        }}
      >
        <AppText variant="display">Network Join Complete</AppText>
        <AppText variant="body">
          Distributor: {params.distributorName ?? "Connected distributor"}
        </AppText>
        <AppText variant="body">Invite Code: {params.code ?? "-"}</AppText>
        <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          <AppButton label="Browse Catalogue" onPress={() => router.replace("/(app)/browse")} />
          <AppButton
            label="Scan Another QR"
            variant="secondary"
            onPress={() => router.push("/(app)/join/scan-distributor-qr" as never)}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

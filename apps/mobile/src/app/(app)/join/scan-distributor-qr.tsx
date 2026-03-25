import { useState } from "react";
import { Alert, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

import { inviteNetworkApi } from "@/features/network/api/invite-network-api";
import { useAuthSession } from "@/features/auth/state/auth-context";
import { AppButton } from "@/shared/components/ui/app-button";
import { AppText } from "@/shared/components/ui/app-text";
import { ScreenContainer } from "@/shared/components/ui/screen-container";
import { useTheme } from "@/shared/theme/theme-context";

const extractCode = (raw: string): string | null => {
  const text = raw.trim();
  if (!text) {
    return null;
  }

  if (text.startsWith("http")) {
    try {
      const url = new URL(text);
      const queryCode = url.searchParams.get("code");
      return queryCode ? queryCode.toUpperCase() : null;
    } catch {
      return null;
    }
  }

  return text.toUpperCase();
};

export default function ScanDistributorQRScreen() {
  const { theme } = useTheme();
  const { user } = useAuthSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [validatedDistributor, setValidatedDistributor] = useState<{
    distributor_name: string;
    service_city: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async (rawData: string) => {
    if (loading || scannedCode) {
      return;
    }

    const code = extractCode(rawData);
    if (!code) {
      Alert.alert("Invalid QR", "Could not extract invite code.");
      return;
    }

    setLoading(true);
    try {
      const validation = await inviteNetworkApi.validateInvite(code);
      setScannedCode(code);
      setValidatedDistributor({
        distributor_name: validation.distributor_name,
        service_city: validation.service_city
      });
    } catch (error) {
      Alert.alert("Invite Invalid", error instanceof Error ? error.message : "Try again.");
    } finally {
      setLoading(false);
    }
  };

  const confirmJoin = async () => {
    if (!scannedCode || !user?.id) {
      return;
    }

    setLoading(true);
    try {
      await inviteNetworkApi.joinRetailerNetwork({
        inviteCode: scannedCode,
        retailerUserId: user.id,
        joinSource: "qr_scan"
      });
      Alert.alert("Join Successful", `Connected to ${validatedDistributor?.distributor_name}`);
      setScannedCode(null);
      setValidatedDistributor(null);
    } catch (error) {
      Alert.alert("Join Failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <ScreenContainer>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">Camera Permission Required</AppText>
          <AppText variant="body">Enable camera to scan distributor QR invite codes.</AppText>
          <AppButton label="Grant Permission" onPress={() => void requestPermission()} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={{ gap: theme.spacing.md }}>
        <AppText variant="heading">Scan Distributor QR</AppText>
        <View
          style={{
            borderRadius: theme.radius.lg,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: theme.colors.border,
            height: 320
          }}
        >
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }: { data: string }) => {
              void handleScan(data);
            }}
          />
        </View>

        {scannedCode && validatedDistributor ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
              padding: theme.spacing.md,
              gap: theme.spacing.sm
            }}
          >
            <AppText variant="heading">{validatedDistributor.distributor_name}</AppText>
            <AppText variant="body">
              Service City: {validatedDistributor.service_city ?? "Not specified"}
            </AppText>
            <AppText variant="body">Invite Code: {scannedCode}</AppText>
            <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
              <AppButton
                label={loading ? "Joining..." : "Confirm Join"}
                onPress={() => {
                  void confirmJoin();
                }}
                disabled={loading}
              />
              <AppButton
                label="Rescan"
                variant="secondary"
                onPress={() => {
                  setScannedCode(null);
                  setValidatedDistributor(null);
                }}
              />
            </View>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

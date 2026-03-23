import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, View } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";

import { authApi } from "@/features/auth/api/auth-api";
import { useAuthSession } from "@/features/auth/state/auth-context";
import { AppButton } from "@/shared/components/ui/app-button";
import { AppText } from "@/shared/components/ui/app-text";
import { AppTextInput } from "@/shared/components/ui/app-text-input";
import { ScreenContainer } from "@/shared/components/ui/screen-container";
import { useTheme } from "@/shared/theme/theme-context";

const normalizeMobileNumber = (value: string) => value.replace(/\D/g, "").slice(0, 10);

export default function WelcomeScreen() {
  const { theme } = useTheme();
  const { loginWithOtp } = useAuthSession();
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isMobileValid = useMemo(() => mobileNumber.length === 10, [mobileNumber]);
  const isOtpValid = useMemo(() => otp.length === 4, [otp]);

  const requestOtp = async () => {
    if (!isMobileValid || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await authApi.requestOtp({
        mobileNumber
      });
      setVerificationId(response.verificationId);
      Alert.alert("OTP Sent", "Use 1234 to complete the mock verification flow.");
    } catch (error) {
      Alert.alert("Unable to send OTP", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    if (!verificationId || !isOtpValid || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      await loginWithOtp({
        mobileNumber,
        verificationId,
        otp
      });
      router.replace("/(app)");
    } catch (error) {
      Alert.alert("Verification failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          justifyContent: "center"
        }}
      >
        <View style={{ gap: theme.spacing.xl }}>
          <View style={{ gap: theme.spacing.sm }}>
            <AppText variant="display">SupplySetu</AppText>
            <AppText
              variant="body"
              style={{
                color: theme.colors.textMuted
              }}
            >
              Fast retailer login with mobile number and OTP.
            </AppText>
          </View>

          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              gap: theme.spacing.lg
            }}
          >
            <AppTextInput
              autoFocus
              keyboardType="number-pad"
              label="Mobile Number"
              maxLength={10}
              onChangeText={(value) => setMobileNumber(normalizeMobileNumber(value))}
              placeholder="Enter 10-digit number"
              returnKeyType="done"
              textContentType="telephoneNumber"
              value={mobileNumber}
              helperText="Use the shop-linked mobile number."
            />

            {verificationId ? (
              <AppTextInput
                keyboardType="number-pad"
                label="OTP"
                maxLength={4}
                onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Enter 4-digit OTP"
                returnKeyType="done"
                value={otp}
                helperText="Mock OTP for this build: 1234"
              />
            ) : null}

            {!verificationId ? (
              <AppButton
                disabled={!isMobileValid || submitting}
                label={submitting ? "Sending OTP..." : "Send OTP"}
                onPress={() => {
                  void requestOtp();
                }}
              />
            ) : (
              <View style={{ gap: theme.spacing.md }}>
                <AppButton
                  disabled={!isOtpValid || submitting}
                  label={submitting ? "Verifying..." : "Verify OTP"}
                  onPress={() => {
                    void verifyOtp();
                  }}
                />
                <AppButton
                  label="Change Mobile Number"
                  onPress={() => {
                    setVerificationId(null);
                    setOtp("");
                  }}
                  variant="secondary"
                />
              </View>
            )}
          </View>

          <AppText
            variant="body"
            style={{
              color: theme.colors.textMuted
            }}
          >
            App version {Constants.expoConfig?.version ?? "0.1.0"}
          </AppText>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

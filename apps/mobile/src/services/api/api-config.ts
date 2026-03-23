import Constants from "expo-constants";
import { Platform } from "react-native";

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string; apiTimeoutMs?: number } | undefined;
const defaultApiHost = Platform.OS === "android" ? "10.0.2.2" : "localhost";

export const apiConfig = {
  baseUrl: extra?.apiBaseUrl ?? `http://${defaultApiHost}:3000/api/v1`,
  timeoutMs: extra?.apiTimeoutMs ?? 12000
};

import * as SecureStore from "expo-secure-store";

const PENDING_INVITE_CODE_KEY = "supplysetu.pending.invite.code";

export const pendingInviteStore = {
  async getCode(): Promise<string | null> {
    return SecureStore.getItemAsync(PENDING_INVITE_CODE_KEY);
  },
  async setCode(code: string): Promise<void> {
    await SecureStore.setItemAsync(PENDING_INVITE_CODE_KEY, code.trim().toUpperCase(), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    });
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(PENDING_INVITE_CODE_KEY);
  }
};

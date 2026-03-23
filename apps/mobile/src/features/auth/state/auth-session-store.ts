import * as SecureStore from "expo-secure-store";

import { AuthSession, AuthTokens } from "@/features/auth/auth.types";

const SESSION_KEY = "supplysetu.auth.session";

export const authSessionStore = {
  async load(): Promise<AuthSession | null> {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  },

  async save(session: AuthSession): Promise<void> {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    });
  },

  async updateTokens(tokens: AuthTokens): Promise<AuthSession | null> {
    const session = await authSessionStore.load();

    if (!session) {
      return null;
    }

    const updatedSession = {
      ...session,
      tokens
    };

    await authSessionStore.save(updatedSession);
    return updatedSession;
  },

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
};

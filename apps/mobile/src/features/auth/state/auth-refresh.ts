import { authApi } from "@/features/auth/api/auth-api";

import { authSessionStore } from "./auth-session-store";

let refreshPromise: Promise<string | null> | null = null;

export const refreshStoredSession = async (): Promise<string | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const currentSession = await authSessionStore.load();

    if (!currentSession) {
      return null;
    }

    try {
      const tokens = await authApi.refresh(currentSession.tokens.refreshToken);
      const updatedSession = await authSessionStore.updateTokens(tokens);
      return updatedSession?.tokens.accessToken ?? null;
    } catch {
      await authSessionStore.clear();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

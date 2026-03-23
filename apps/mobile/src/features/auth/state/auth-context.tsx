import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";

import { authApi } from "@/features/auth/api/auth-api";
import { AuthSession, AuthTokens, AuthUser } from "@/features/auth/auth.types";
import { responseCache } from "@/services/cache/cache-store";
import { queryClient } from "@/shared/query/query-client";

import { authSessionStore } from "./auth-session-store";

type AuthContextSession = {
  status: "bootstrapping" | "authenticated" | "anonymous";
  isAuthenticated: boolean;
  tokens: AuthTokens | null;
  user: AuthUser | null;
};

type AuthContextValue = AuthContextSession & {
  setSession: (session: AuthSession) => Promise<void>;
  clearSession: () => Promise<void>;
  loginWithOtp: (payload: { mobileNumber: string; verificationId: string; otp: string }) => Promise<void>;
  refreshSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState<AuthContextSession>({
    status: "bootstrapping",
    isAuthenticated: false,
    tokens: null,
    user: null
  });

  const setSession = async (session: AuthSession) => {
    await authSessionStore.save(session);
    setState({
      status: "authenticated",
      isAuthenticated: true,
      tokens: session.tokens,
      user: session.user
    });
  };

  const clearSession = async () => {
    await authSessionStore.clear();
    await responseCache.clear();
    queryClient.clear();
    setState({
      status: "anonymous",
      isAuthenticated: false,
      tokens: null,
      user: null
    });
  };

  const loginWithOtp = async (payload: { mobileNumber: string; verificationId: string; otp: string }) => {
    const session = await authApi.verifyOtp(payload);
    await setSession(session);
  };

  const refreshSession = async () => {
    const currentSession = await authSessionStore.load();

    if (!currentSession) {
      await clearSession();
      return false;
    }

    try {
      const tokens = await authApi.refresh(currentSession.tokens.refreshToken);
      const nextSession = {
        ...currentSession,
        tokens
      };
      await setSession(nextSession);
      return true;
    } catch {
      await clearSession();
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      const session = await authSessionStore.load();

      if (!mounted) {
        return;
      }

      if (!session) {
        setState({
          status: "anonymous",
          isAuthenticated: false,
          tokens: null,
          user: null
        });
        return;
      }

      if (session.tokens.accessTokenExpiresAt <= Date.now()) {
        const refreshed = await refreshSession();

        if (!refreshed && mounted) {
          setState({
            status: "anonymous",
            isAuthenticated: false,
            tokens: null,
            user: null
          });
        }

        return;
      }

      setState({
        status: "authenticated",
        isAuthenticated: true,
        tokens: session.tokens,
        user: session.user
      });
    };

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      setSession,
      clearSession,
      loginWithOtp,
      refreshSession
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthSession = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthSession must be used within AuthProvider");
  }

  return context;
};

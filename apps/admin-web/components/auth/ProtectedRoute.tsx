"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getStoredSession } from "@/services/auth.service";
import { isTenantOnboardingComplete } from "@/services/onboarding.service";

type ProtectedRouteProps = {
  children: ReactNode;
  mode?: "protected" | "guest" | "onboarding";
};

export function ProtectedRoute({ children, mode = "protected" }: ProtectedRouteProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const session = getStoredSession();
    const hasSession = Boolean(session?.accessToken);

    if (mode === "guest") {
      if (hasSession) {
        router.replace("/review-orders");
        return;
      }

      setAuthorized(true);
      return;
    }

    if (!hasSession) {
      router.replace("/login");
      return;
    }

    if (mode === "onboarding" && isTenantOnboardingComplete()) {
      router.replace("/review-orders");
      return;
    }

    setAuthorized(true);
  }, [mode, router]);

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Loading...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

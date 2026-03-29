"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getStoredRetailerSession } from "@/services/auth.service";
import type { RetailerSession } from "@/types/auth";

type ProtectedRouteProps = {
  children: ReactNode;
  mode: "guest" | "preselected" | "selected";
};

export function ProtectedRoute({ children, mode }: ProtectedRouteProps) {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [session, setSession] = useState<RetailerSession | null>(null);
  const isAuthorized =
    isHydrated &&
    (mode === "guest"
      ? !session
      : mode === "preselected"
        ? Boolean(session && session.stage === "preselected")
        : Boolean(session && session.stage === "selected"));

  useEffect(() => {
    setSession(getStoredRetailerSession());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (mode === "guest") {
      if (!session) {
        return;
      }

      router.replace(session.stage === "selected" ? "/catalogue" : "/select-distributor");
      return;
    }

    if (!session) {
      router.replace("/login");
      return;
    }

    if (mode === "preselected") {
      if (session.stage === "selected") {
        router.replace("/catalogue");
      }
      return;
    }

    if (session.stage !== "selected") {
      router.replace("/select-distributor");
    }
  }, [isHydrated, mode, router, session]);

  if (!isHydrated || !isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Loading...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

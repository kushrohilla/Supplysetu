"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  acceptInvite,
  getApiErrorMessage,
  getDistributors,
  getRetailerSessionServerSnapshot,
  getRetailerSessionSnapshot,
  selectDistributor,
  subscribeToRetailerSession,
  validateInvite,
} from "@/lib/auth";
import type { InviteValidationResponse } from "@/types/auth";

function InvitePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSyncExternalStore(
    subscribeToRetailerSession,
    getRetailerSessionSnapshot,
    getRetailerSessionServerSnapshot,
  );
  const token = searchParams.get("token")?.trim() ?? "";
  const [inviteState, setInviteState] = useState<InviteValidationResponse | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [attemptedToken, setAttemptedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadInvite = async () => {
      if (!token) {
        setInviteState({ valid: false });
        setLoadingInvite(false);
        return;
      }

      setLoadingInvite(true);
      setError(null);
      setAttemptedToken(null);

      try {
        const response = await validateInvite(token);
        if (!cancelled) {
          setInviteState(response);
        }
      } catch (inviteError) {
        if (!cancelled) {
          setError(getApiErrorMessage(inviteError, "Unable to load invite."));
          setInviteState(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingInvite(false);
        }
      }
    };

    void loadInvite();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (loadingInvite || !inviteState?.valid || !token || session !== null) {
      return;
    }

    router.replace(`/login?inviteToken=${encodeURIComponent(token)}`);
  }, [inviteState, loadingInvite, router, session, token]);

  useEffect(() => {
    if (!inviteState?.valid || !token || !session || attemptedToken === token || accepting) {
      return;
    }

    let cancelled = false;

    const acceptAndSelectDistributor = async () => {
      setAttemptedToken(token);
      setAccepting(true);
      setError(null);

      try {
        await acceptInvite(token);
        const distributors = await getDistributors();
        const distributor = distributors.find((option) => option.name === inviteState.distributor.name);

        if (!distributor) {
          throw new Error("Invite accepted, but the distributor could not be opened.");
        }

        await selectDistributor(distributor);
        if (!cancelled) {
          router.replace("/catalogue");
        }
      } catch (acceptError) {
        if (!cancelled) {
          setError(getApiErrorMessage(acceptError, "Unable to accept invite."));
          setAttemptedToken(null);
        }
      } finally {
        if (!cancelled) {
          setAccepting(false);
        }
      }
    };

    void acceptAndSelectDistributor();

    return () => {
      cancelled = true;
    };
  }, [accepting, attemptedToken, inviteState, router, session, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Distributor Invite</p>

        {loadingInvite ? (
          <>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Checking invite...</h1>
            <p className="mt-2 text-sm text-slate-600">We're validating the invite link and preparing your onboarding flow.</p>
          </>
        ) : inviteState?.valid ? (
          <>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              You're joining {inviteState.distributor.name}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              This invite will securely connect your retailer account to the distributor so you can browse catalogue
              items and place orders.
            </p>
            <p className="mt-6 rounded-xl bg-slate-100 px-3 py-3 text-sm text-slate-700">
              {!session
                ? "Redirecting you to login..."
                : accepting
                  ? "Linking your account and opening the catalogue..."
                  : "Preparing your access..."}
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Invalid or expired invite</h1>
            <p className="mt-2 text-sm text-slate-600">
              The invite link may be invalid, expired, or already used. Ask your distributor for a fresh invite link.
            </p>
          </>
        )}

        {error ? <p className="mt-6 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        {!loadingInvite && inviteState?.valid && session && error ? (
          <button
            type="button"
            className="mt-6 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
            onClick={() => setAttemptedToken(null)}
          >
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Distributor Invite</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Checking your invite</h1>
            <p className="mt-2 text-sm text-slate-600">Preparing the invite flow...</p>
          </div>
        </div>
      }
    >
      <InvitePageContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { getApiErrorMessage, getDistributors, selectDistributor } from "@/services/auth.service";
import type { DistributorOption } from "@/types/auth";

export default function SelectDistributorPage() {
  const router = useRouter();
  const [distributors, setDistributors] = useState<DistributorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDistributors = async () => {
      try {
        setError(null);
        const response = await getDistributors();
        setDistributors(response);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, "Unable to load distributors."));
      } finally {
        setLoading(false);
      }
    };

    void loadDistributors();
  }, []);

  return (
    <ProtectedRoute mode="preselected">
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Choose Distributor</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Select the business you want to order from</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your catalogue and orders will be scoped to the distributor you select here.
          </p>

          {loading ? <p className="mt-6 text-sm text-slate-600">Loading distributors...</p> : null}
          {error ? <p className="mt-6 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          {!loading && !error && distributors.length === 0 ? (
            <p className="mt-6 rounded-xl bg-slate-100 px-3 py-3 text-sm text-slate-700">
              No linked distributors are available yet.
            </p>
          ) : null}

          <div className="mt-6 space-y-3">
            {distributors.map((distributor) => (
              <button
                key={distributor.id}
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-4 text-left hover:border-slate-400"
                disabled={submittingId !== null}
                onClick={async () => {
                  setSubmittingId(distributor.id);
                  setError(null);

                  try {
                    await selectDistributor(distributor);
                    router.push("/catalogue");
                  } catch (selectionError) {
                    setError(getApiErrorMessage(selectionError, "Unable to select distributor."));
                  } finally {
                    setSubmittingId(null);
                  }
                }}
              >
                <div>
                  <p className="text-base font-semibold text-slate-900">{distributor.name}</p>
                  <p className="text-sm text-slate-600">{distributor.city || "City not available"}</p>
                </div>
                <span className="text-sm font-medium text-slate-500">
                  {submittingId === distributor.id ? "Opening..." : "Select"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

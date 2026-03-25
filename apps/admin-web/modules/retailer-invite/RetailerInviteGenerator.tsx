"use client";

import { useEffect, useState } from "react";
import { retailerInviteService } from "@/services/retailer-invite.service";
import type { JoinedRetailerRecord, RetailerInviteRecord } from "@/types/retailer-invite";

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export function RetailerInviteGenerator() {
  const tenantId = retailerInviteService.getTenantId();
  const [invite, setInvite] = useState<RetailerInviteRecord | null>(null);
  const [joinedRetailers, setJoinedRetailers] = useState<JoinedRetailerRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [currentInvite, retailers] = await Promise.all([
        retailerInviteService.getCurrentInvite(tenantId),
        retailerInviteService.getJoinedRetailers(tenantId)
      ]);
      setInvite(currentInvite);
      setJoinedRetailers(retailers);
    } catch {
      setError("Failed to load invite data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyInviteLink = async () => {
    if (!invite) {
      return;
    }
    try {
      await navigator.clipboard.writeText(invite.invite_url);
      setMessage("Invite link copied.");
      setError(null);
    } catch {
      setError("Unable to copy invite link.");
    }
  };

  const regenerateInvite = async () => {
    setLoading(true);
    setError(null);
    try {
      const nextInvite = await retailerInviteService.generateInvite(tenantId, "admin-user");
      setInvite(nextInvite);
      setMessage("Invite generated.");
    } catch {
      setError("Failed to generate invite.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[620px] flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Retailer Invite Generator</h1>
        <p className="text-sm text-slate-600">
          Share distributor invite link and monitor retailer joins.
        </p>
      </div>

      {message ? <div className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <section className="grid grid-cols-12 gap-4">
        <div className="col-span-7 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Invite Link</h2>
          {invite ? (
            <div className="mt-3 space-y-3 text-sm">
              <div className="rounded border border-slate-200 bg-slate-50 p-2 font-mono text-xs">
                {invite.invite_url}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void copyInviteLink()}
                  className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={() => void regenerateInvite()}
                  disabled={loading}
                  className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 disabled:opacity-60"
                >
                  Generate Invite
                </button>
              </div>
              <div className="text-xs text-slate-500">
                Invite Code: <span className="font-mono">{invite.invite_code}</span>
              </div>
              <div className="text-xs text-slate-500">Created: {formatDate(invite.created_at)}</div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-slate-500">
              {loading ? "Loading invite..." : "No invite available."}
            </div>
          )}
        </div>

        <div className="col-span-5 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">QR Code View</h2>
          <div className="mt-3 flex items-center justify-center">
            <div className="h-48 w-48 rounded border border-slate-300 bg-slate-50 p-4">
              <div className="grid h-full w-full grid-cols-8 gap-1">
                {Array.from({ length: 64 }).map((_, index) => (
                  <div
                    key={index}
                    className={index % 3 === 0 || index % 5 === 0 ? "bg-slate-800" : "bg-white"}
                  />
                ))}
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">
            QR placeholder for invite code sharing
          </p>
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-3 py-2">
          <h2 className="text-sm font-semibold text-slate-900">Joined Retailers</h2>
        </header>
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="border-b border-slate-200 px-2 py-2">Retailer ID</th>
              <th className="border-b border-slate-200 px-2 py-2">Join Source</th>
              <th className="border-b border-slate-200 px-2 py-2">Status</th>
              <th className="border-b border-slate-200 px-2 py-2">Joined At</th>
            </tr>
          </thead>
          <tbody>
            {joinedRetailers.map((retailer) => (
              <tr key={`${retailer.retailer_id}-${retailer.created_at}`} className="border-b border-slate-100">
                <td className="px-2 py-2 font-medium text-slate-800">{retailer.retailer_id}</td>
                <td className="px-2 py-2 text-slate-700">{retailer.join_source}</td>
                <td className="px-2 py-2 text-slate-700">{retailer.status}</td>
                <td className="px-2 py-2 text-slate-600">{formatDate(retailer.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

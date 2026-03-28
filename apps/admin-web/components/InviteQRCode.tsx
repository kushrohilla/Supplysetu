"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type InviteQRCodeProps = {
  inviteLink: string;
};

export function InviteQRCode({ inviteLink }: InviteQRCodeProps) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyFeedback("Copied!");
    } catch {
      setCopyFeedback("Unable to copy link.");
    } finally {
      window.setTimeout(() => {
        setCopyFeedback(null);
      }, 2000);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <QRCodeSVG value={inviteLink} size={220} />
        <div className="w-full space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Invite Link</p>
          <p className="break-all rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            {inviteLink}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Copy Link
          </button>
          {copyFeedback ? <p className="text-sm text-slate-600">{copyFeedback}</p> : null}
        </div>
      </div>
    </div>
  );
}

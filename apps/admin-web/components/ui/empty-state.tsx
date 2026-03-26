import React from "react";

export type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  helper: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  hint?: React.ReactNode;
};

export function EmptyState({ icon, title, helper, ctaLabel, onCtaPress, hint }: EmptyStateProps) {
  return (
    <div className="mx-auto w-full max-w-[480px] rounded-xl bg-slate-50 px-8 py-12 text-center">
      <div className="mb-4 flex justify-center opacity-70">
        <span className="text-5xl text-slate-400">{icon}</span>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mb-6 text-sm leading-relaxed text-slate-500">{helper}</p>

      {ctaLabel && onCtaPress && (
        <div className="mb-6 w-full">
          <button
            type="button"
            onClick={onCtaPress}
            className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {ctaLabel}
          </button>
        </div>
      )}

      {hint && (
        <div className="w-full border-t border-slate-200 pt-6 text-left text-sm text-slate-600">
          {hint}
        </div>
      )}
    </div>
  );
}

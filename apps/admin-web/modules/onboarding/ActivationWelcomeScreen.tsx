"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ONBOARDING_COMPLETE_COOKIE_NAME, ONBOARDING_COMPLETE_COOKIE_VALUE } from "@/services/session.constants";

type ActivationWelcomeScreenProps = {
  companyName: string;
  hasBrand: boolean;
  hasProduct: boolean;
  hasRetailer: boolean;
  hasRoute: boolean;
  hasOrder: boolean;
};

export function ActivationWelcomeScreen({
  companyName,
  hasBrand,
  hasProduct,
  hasRetailer,
  hasRoute,
  hasOrder
}: ActivationWelcomeScreenProps) {
  const router = useRouter();

  const steps = useMemo(() => {
    return [
      {
        id: "account",
        label: "Create account",
        isComplete: true,
        actionLabel: "✓ Done",
        isLocked: false,
        onClick: null
      },
      {
        id: "brand",
        label: "Add first brand",
        isComplete: hasBrand,
        actionLabel: hasBrand ? "✓ Done" : "→ Start here",
        isLocked: false,
        onClick: () => router.push("/catalogue")
      },
      {
        id: "product",
        label: "Add first product SKU",
        isComplete: hasProduct,
        actionLabel: hasProduct ? "✓ Done" : (!hasBrand ? "Locked" : "→ Start here"),
        isLocked: !hasBrand,
        onClick: !hasBrand ? null : () => router.push("/catalogue")
      },
      {
        id: "retailer",
        label: "Add first retailer",
        isComplete: hasRetailer,
        actionLabel: hasRetailer ? "✓ Done" : (!hasProduct ? "Locked" : "→ Start here"),
        isLocked: !hasProduct,
        onClick: !hasProduct ? null : () => router.push("/retailers")
      },
      {
        id: "route",
        label: "Create first route",
        isComplete: hasRoute,
        actionLabel: hasRoute ? "✓ Done" : (!hasRetailer ? "Locked" : "→ Start here"),
        isLocked: !hasRetailer,
        onClick: !hasRetailer ? null : () => router.push("/delivery")
      },
      {
        id: "order",
        label: "Receive first order",
        isComplete: hasOrder,
        actionLabel: hasOrder ? "✓ Done" : "Auto-detected",
        isLocked: !hasRoute,
        onClick: null
      }
    ];
  }, [hasBrand, hasProduct, hasRetailer, hasRoute, hasOrder, router]);

  const completedSteps = steps.filter((s) => s.isComplete).length;
  const progressPercent = Math.round((completedSteps / steps.length) * 100);
  const nextIncompleteStep = steps.find((s) => !s.isComplete);

  const completeOnboarding = () => {
    document.cookie = `${ONBOARDING_COMPLETE_COOKIE_NAME}=${ONBOARDING_COMPLETE_COOKIE_VALUE}; path=/`;
    router.replace("/review-orders");
    router.refresh();
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-[600px] rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {companyName}.</h1>
        <p className="mt-2 text-slate-600">Your distribution command center is ready.</p>

        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
            <span>{completedSteps} of {steps.length} complete</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-700 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="mt-8 space-y-1">
          {steps.map((step) => {
            const isClickable = !step.isComplete && !step.isLocked && step.onClick;
            return (
              <div
                key={step.id}
                onClick={isClickable ? step.onClick! : undefined}
                className={[
                  "flex items-center justify-between rounded-lg px-4 py-3 transition-colors",
                  isClickable ? "cursor-pointer hover:bg-slate-50" : "",
                  step.isComplete ? "opacity-60" : "",
                  step.isLocked ? "opacity-50" : ""
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  {step.isComplete ? (
                    <span className="text-emerald-600 font-bold">✓</span>
                  ) : step.isLocked ? (
                    <span className="text-slate-300">○</span>
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-900" />
                  )}
                  <span
                    className={[
                      "font-medium",
                      step.isComplete || step.isLocked ? "text-slate-500" : "text-slate-900",
                      step.isComplete ? "line-through" : ""
                    ].join(" ")}
                  >
                    {step.label}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "text-sm",
                      step.isComplete ? "text-emerald-600" : "",
                      !step.isComplete && !step.isLocked ? "font-medium text-slate-900" : "",
                      step.isLocked ? "text-slate-400" : ""
                    ].join(" ")}
                  >
                    {step.actionLabel}
                  </span>
                  {step.isLocked && <span className="text-slate-300">🔒</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="my-8 flex justify-center">
          <button
            onClick={() => {
              if (nextIncompleteStep && nextIncompleteStep.onClick) {
                nextIncompleteStep.onClick();
              }
            }}
            disabled={!nextIncompleteStep || !nextIncompleteStep.onClick}
            className="group flex w-full max-w-[300px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {nextIncompleteStep && nextIncompleteStep.onClick ? (
              <>
                {nextIncompleteStep.label} &rarr;
              </>
            ) : nextIncompleteStep?.id === "order" ? (
              "Waiting for first order..."
            ) : (
              "Setup complete"
            )}
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 border-t border-slate-100 pt-6 text-sm">
          <button
            onClick={completeOnboarding}
            className="text-slate-500 hover:text-slate-900 transition-colors"
          >
            Skip setup
          </button>
          <span className="text-slate-300">•</span>
          <button
            onClick={() => alert("Walkthrough modal placeholder")}
            className="text-slate-500 hover:text-slate-900 transition-colors"
          >
            Watch 2-min walkthrough
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ActivationWelcomeScreen } from "@/modules/onboarding/ActivationWelcomeScreen";
import { getStoredSession } from "@/services/auth.service";

export default function OnboardingPage() {
  const session = getStoredSession();
  const companyName = session?.tenant.distributor_name ?? "Distributor";

  return (
    <ProtectedRoute mode="onboarding">
      <ActivationWelcomeScreen
        companyName={companyName}
        hasBrand={false}
        hasProduct={false}
        hasRetailer={false}
        hasRoute={false}
        hasOrder={false}
      />
    </ProtectedRoute>
  );
}

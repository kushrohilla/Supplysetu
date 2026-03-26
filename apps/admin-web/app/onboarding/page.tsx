import { ActivationWelcomeScreen } from "@/modules/onboarding/ActivationWelcomeScreen";
import { isAuthenticated } from "@/services/auth.service";
import { isTenantOnboardingComplete } from "@/services/onboarding.service";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  if (await isTenantOnboardingComplete()) {
    redirect("/review-orders");
  }

  const companyName = "Anubhav Traders";
  
  // Note: in a real implementation these boolean flags would be fetched from 
  // backend services (e.g. catalogueService.hasBrands()) to determine the completed steps.
  // For now, we seed it with false to show the activation screen unlocking step 1.
  return (
    <ActivationWelcomeScreen 
      companyName={companyName}
      hasBrand={false}
      hasProduct={false}
      hasRetailer={false}
      hasRoute={false}
      hasOrder={false}
    />
  );
}

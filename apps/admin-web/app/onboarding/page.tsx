import { TenantOnboardingWizard } from "@/modules/onboarding/TenantOnboardingWizard";
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

  return <TenantOnboardingWizard />;
}

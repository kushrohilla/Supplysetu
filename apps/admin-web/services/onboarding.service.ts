import { cookies } from "next/headers";
import {
  ONBOARDING_COMPLETE_COOKIE_NAME,
  ONBOARDING_COMPLETE_COOKIE_VALUE
} from "@/services/session.constants";

export async function isTenantOnboardingComplete(): Promise<boolean> {
  const cookieStore = await cookies();
  const status = cookieStore.get(ONBOARDING_COMPLETE_COOKIE_NAME)?.value;
  return status === ONBOARDING_COMPLETE_COOKIE_VALUE;
}

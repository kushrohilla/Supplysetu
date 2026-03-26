"use client";

import {
  ONBOARDING_COMPLETE_STORAGE_KEY,
  ONBOARDING_COMPLETE_STORAGE_VALUE,
} from "@/services/session.constants";

const canUseStorage = () => typeof window !== "undefined";

export const isTenantOnboardingComplete = (): boolean => {
  if (!canUseStorage()) {
    return false;
  }

  return window.localStorage.getItem(ONBOARDING_COMPLETE_STORAGE_KEY) === ONBOARDING_COMPLETE_STORAGE_VALUE;
};

export const setTenantOnboardingComplete = () => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(ONBOARDING_COMPLETE_STORAGE_KEY, ONBOARDING_COMPLETE_STORAGE_VALUE);
};

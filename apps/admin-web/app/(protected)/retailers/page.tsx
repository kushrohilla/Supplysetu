import { ModuleUnavailableState } from "@/components/ui/module-unavailable-state";

export default function RetailersPage() {
  return (
    <ModuleUnavailableState
      title="Retailers"
      message="This feature is not available yet."
      futureDescription="Retailer management, onboarding, and relationship tools will appear here once backend support is ready."
    />
  );
}

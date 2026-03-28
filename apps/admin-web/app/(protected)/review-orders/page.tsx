import { ModuleUnavailableState } from "@/components/ui/module-unavailable-state";

export default function ReviewOrdersPage() {
  return (
    <ModuleUnavailableState
      title="Orders"
      message="This feature is not available yet."
      futureDescription="Order review, approval, and status workflows will appear here once backend support is ready."
    />
  );
}

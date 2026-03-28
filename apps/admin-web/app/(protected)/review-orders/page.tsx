import { ModuleUnavailableState } from "@/components/ui/module-unavailable-state";

export default function ReviewOrdersPage() {
  return (
    <ModuleUnavailableState
      title="Order management is not available yet"
      helper="Future order review, approval, and status workflows will appear here once backend support is ready."
    />
  );
}

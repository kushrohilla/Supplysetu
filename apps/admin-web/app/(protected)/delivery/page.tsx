import { ModuleUnavailableState } from "@/components/ui/module-unavailable-state";

export default function DeliveryPage() {
  return (
    <ModuleUnavailableState
      title="Delivery"
      message="This feature is not available yet."
      futureDescription="Delivery execution, proof of delivery, and collection workflows will appear here once backend support is ready."
    />
  );
}

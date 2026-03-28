import { ModuleUnavailableState } from "@/components/ui/module-unavailable-state";

export default function InventoryPage() {
  return (
    <ModuleUnavailableState
      title="Inventory"
      message="This feature is not available yet."
      futureDescription="Inventory visibility and stock controls will appear here once backend support is ready."
    />
  );
}

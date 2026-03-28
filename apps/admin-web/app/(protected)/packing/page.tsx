import { ModuleUnavailableState } from "@/components/ui/module-unavailable-state";

export default function PackingPage() {
  return (
    <ModuleUnavailableState
      title="Packing"
      message="This feature is not available yet."
      futureDescription="Packing queues, pick lists, and completion workflows will appear here once backend support is ready."
    />
  );
}

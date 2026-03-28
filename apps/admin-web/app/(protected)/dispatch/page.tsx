import { ModuleUnavailableState } from "@/components/ui/module-unavailable-state";

export default function DispatchPage() {
  return (
    <ModuleUnavailableState
      title="Dispatch"
      message="This feature is not available yet."
      futureDescription="Dispatch planning, batching, and logistics coordination will appear here once backend support is ready."
    />
  );
}

import { ModuleUnavailableState } from "@/components/ui/module-unavailable-state";

export default function ReportsPage() {
  return (
    <ModuleUnavailableState
      title="Reports"
      message="This feature is not available yet."
      futureDescription="Operational reports and business insights will appear here once backend support is ready."
    />
  );
}

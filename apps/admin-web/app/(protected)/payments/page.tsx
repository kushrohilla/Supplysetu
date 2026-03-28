import { ModuleUnavailableState } from "@/components/ui/module-unavailable-state";

export default function PaymentsPage() {
  return (
    <ModuleUnavailableState
      title="Payments"
      message="This feature is not available yet."
      futureDescription="Payment tracking, reconciliation, and settlement workflows will appear here once backend support is ready."
    />
  );
}

"use client";

import { EmptyState } from "@/components/ui/empty-state";

export function ReportsDashboard() {
  return (
    <div className="flex h-[calc(100vh-8rem)] w-full max-w-2xl flex-col items-center justify-center mx-auto text-center px-4">
      <EmptyState
        icon={<span className="text-4xl">📊</span>}
        title="Reports will appear after orders."
        helper="Your dashboard is currently ghosted. Growth analytics, total receivables, and route profitability will generate automatically once your first batch of orders is dispatched."
      />
    </div>
  );
}

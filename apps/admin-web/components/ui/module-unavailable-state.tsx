import { EmptyState } from "@/components/ui/empty-state";

type ModuleUnavailableStateProps = {
  title: string;
  helper?: string;
};

export function ModuleUnavailableState({
  title,
  helper = "This section will stay empty until the backend supports it.",
}: ModuleUnavailableStateProps) {
  return (
    <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center p-8">
      <EmptyState icon="!" title={title} helper={helper} />
    </div>
  );
}

import { EmptyState } from "@/components/ui/empty-state";

type ModuleUnavailableStateProps = {
  title: string;
  message?: string;
  futureDescription?: string;
};

export function ModuleUnavailableState({
  title,
  message = "This feature is not available yet.",
  futureDescription,
}: ModuleUnavailableStateProps) {
  return (
    <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center p-8">
      <EmptyState
        icon="!"
        title={title}
        helper={message}
        hint={futureDescription ? <p>{futureDescription}</p> : undefined}
      />
    </div>
  );
}

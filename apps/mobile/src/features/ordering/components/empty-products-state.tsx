import { EmptyState } from "@/shared/components/ui/empty-state";

type EmptyProductsStateProps = {
  onClearSearch?: () => void;
};

export const EmptyProductsState = ({ onClearSearch }: EmptyProductsStateProps) => {
  return (
    <EmptyState
      icon="🔍"
      title="No matching SKU found"
      helper="Try browsing by brand instead, or contact your distributor if an item is missing."
      ctaLabel={onClearSearch ? "Browse by brand" : undefined}
      onCtaPress={onClearSearch}
    />
  );
};

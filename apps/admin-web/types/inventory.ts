export type InventoryItem = {
  product_id: string;
  product_name: string;
  brand_name: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  last_synced_at: string | null;
};

export type InventorySyncMetadata = {
  tenant_id: string;
  sync_status: string;
  triggered_at: string;
  total_products: number;
  low_stock_count: number;
  rate_limited: boolean;
};

export type UpdateInventoryPayload = {
  stock_quantity: number;
  low_stock_threshold: number;
};

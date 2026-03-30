// ── Route types ──────────────────────────────────────────────────────

export type DispatchRouteRecord = {
  id: string;
  name: string;
  description: string | null;
  retailer_count: number;
  created_at: string;
};

export type CreateRoutePayload = {
  name: string;
  description?: string;
  retailer_ids: string[];
};

export type AssignRouteRetailersPayload = {
  retailer_ids: string[];
};

// ── Batch types ──────────────────────────────────────────────────────

export type BatchStatus = "PENDING" | "DISPATCHED" | "COMPLETED";

export type DispatchBatchListRecord = {
  id: string;
  route_name: string;
  delivery_date: string;
  order_count: number;
  status: BatchStatus;
  created_at: string;
};

export type DispatchBatchRecord = DispatchBatchListRecord & {
  route_id: string | null;
  route_description: string | null;
};

export type CreateBatchPayload = {
  route_id: string;
  delivery_date: string;
  order_ids: string[];
};

// ── Delivery sheet types ─────────────────────────────────────────────

export type SheetOrderItem = {
  id: string;
  product_id: string;
  product_name: string;
  brand_name: string | null;
  quantity: number;
  price: number;
  total_price: number;
};

export type SheetOrder = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  packed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  items: SheetOrderItem[];
};

export type SheetRetailer = {
  retailer: {
    id: string;
    name: string;
    phone: string | null;
    address_line1: string | null;
    locality: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
  };
  sequence_no: number;
  totals: {
    order_count: number;
    total_value: number;
  };
  orders: SheetOrder[];
};

export type DeliverySheetRecord = {
  batch: {
    id: string;
    status: BatchStatus;
    delivery_date: string;
    created_at: string;
  };
  route: {
    id: string | null;
    name: string;
    description: string | null;
  };
  retailers: SheetRetailer[];
};

// ── Deliver order result ─────────────────────────────────────────────

export type DeliverOrderResult = {
  order: { id: string; status: string };
  batch: DispatchBatchRecord | null;
};

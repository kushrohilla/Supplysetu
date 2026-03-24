// Retailer domain types
export interface Retailer {
  id: number;
  phone: string;
  name: string;
  locality?: string;
  city?: string;
  state?: string;
  owner_name?: string;
  credit_line_status: "none" | "pending" | "active" | "blocked";
  created_at: string;
  updated_at: string;
}

export interface RetailerDistributorLink {
  id: number;
  retailer_id: number;
  tenant_id: number;
  status: "active" | "inactive" | "suspended";
  last_ordered_at?: string;
  total_orders: number;
  total_order_value: number;
  referral_code?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderLineItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
  scheme_code?: string;
  scheme_discount: number;
  created_at: string;
  updated_at: string;
}

export interface OrderPayment {
  id: number;
  order_id: number;
  payment_type: "cash" | "advance" | "credit_tag";
  amount: number;
  payment_status: "pending" | "confirmed" | "failed" | "refunded";
  transaction_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface InventorySyncLog {
  id: number;
  tenant_id: number;
  last_sync_at: string;
  total_stock_items: number;
  sync_status: "success" | "partial" | "failed";
  error_details?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// API Request/Response types
export interface OTPLoginRequest {
  phone: string;
}

export interface OTPVerifyRequest {
  phone: string;
  otp: string;
}

export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  retailer: Retailer;
}

export interface DistributorListResponse {
  id: number;
  tenant_id: number;
  name: string;
  logo_url?: string;
  area: string;
  city: string;
  last_ordered_at?: string;
  total_orders: number;
}

export interface ProductListResponse {
  id: number;
  product_id: number;
  tenant_id: number;
  sku: string;
  name: string;
  brand_name: string;
  pack_size: string;
  base_price: number;
  advance_price?: number;
  current_stock: number;
  images?: string[];
  scheme_info?: {
    code: string;
    description: string;
    discount_percent?: number;
  };
}

export interface ReorderItemResponse {
  product_id: number;
  sku: string;
  name: string;
  pack_size: string;
  base_price: number;
  quantity_last_ordered: number;
  last_order_date: string;
  frequency: "daily" | "weekly" | "monthly" | "occasional";
}

export interface CreateOrderRequest {
  tenant_id: number;
  retailer_id: number;
  line_items: Array<{
    product_id: number;
    quantity: number;
  }>;
  payment_type: "cash" | "advance" | "credit_tag";
  idempotency_key: string;
  metadata?: {
    delivery_route?: string;
    special_instructions?: string;
  };
}

export interface CreateOrderResponse {
  order_id: number;
  order_number: string;
  status: string;
  total_amount: number;
  line_item_count: number;
  created_at: string;
  confirmation_token: string;
}

export interface OrderHistoryResponse {
  order_id: number;
  order_number: string;
  order_date: string;
  total_amount: number;
  item_count: number;
  status: string;
  expected_delivery_date?: string;
}

export interface QuickReorderResponse {
  recent_items: ReorderItemResponse[];
  frequently_ordered: ReorderItemResponse[];
  suggested_refills: ReorderItemResponse[];
}

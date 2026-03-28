export type OrderStatus = "DRAFT" | "PLACED" | "CONFIRMED" | "CANCELLED";

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  brand_name: string | null;
  quantity: number;
  price: number;
  total_price: number;
};

export type Order = {
  id: string;
  tenant_id: string;
  retailer_id: string;
  retailer_name: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  updated_at: string;
  items_count?: number;
  items?: OrderItem[];
};

export type CreateOrderPayload = {
  retailer_id: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
};

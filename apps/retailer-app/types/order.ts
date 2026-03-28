export type OrderSummary = {
  id: string;
  retailer_id: string;
  retailer_name: string;
  order_number: string;
  status: "DRAFT" | "PLACED" | "CONFIRMED" | "CANCELLED";
  total_amount: number;
  created_at: string;
  updated_at: string;
  items_count?: number;
};

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

export type OrderDetail = OrderSummary & {
  items: OrderItem[];
};

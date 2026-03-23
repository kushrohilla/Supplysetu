import { PaymentMode, ProductSummary } from "@/features/ordering/ordering.types";

export type RetailerOrderStatus = "invoiced" | "dispatched" | "delivered";

export type RetailerOrderTimelineEvent = {
  key: string;
  label: string;
  timestamp: string;
  completed: boolean;
};

export type RetailerOrder = {
  id: string;
  orderDate: string;
  status: RetailerOrderStatus;
  paymentMode: PaymentMode;
  totalAmount: number;
  expectedDeliveryDate: string;
  items: Array<{
    product: ProductSummary;
    quantity: number;
  }>;
  timeline: RetailerOrderTimelineEvent[];
};

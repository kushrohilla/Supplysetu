export type PaymentMode = "ADVANCE" | "COD";

export type StockRisk = "LOW" | "MEDIUM" | "HIGH";

export type OrderLineItem = {
  id: string;
  skuName: string;
  orderedQuantity: number;
  availableStock: number;
  confirmQuantity: number;
  substituteSkuId: string | null;
  schemeLabel: string;
  substituteOptions: Array<{
    id: string;
    label: string;
  }>;
};

export type ReviewQueueOrder = {
  id: string;
  retailerName: string;
  areaRoute: string;
  totalLineItems: number;
  totalOrderValue: number;
  paymentMode: PaymentMode;
  placedAt: string;
  stockRisk: StockRisk;
  status: "PLACED" | "PARTIALLY_CONFIRMED" | "READY_FOR_PACKING" | "CANCELLED";
  lineItems: OrderLineItem[];
};

export type ConfirmPartialPayload = {
  lineItems: Array<{
    lineItemId: string;
    confirmQuantity: number;
    substituteSkuId?: string | null;
  }>;
};

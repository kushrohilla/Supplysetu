export type DeliveryFilterType = "BATCH" | "AGENT";

export type DeliveryStatus =
  | "DELIVERED"
  | "PARTIALLY_DELIVERED"
  | "DELIVERY_FAILED"
  | "SHOP_CLOSED"
  | "PAYMENT_ISSUE";

export type PaymentMode = "ADVANCE" | "COD";

export type PaymentStatus = "PAID" | "COD_PENDING" | "COD_COLLECTED" | "COD_SHORT";

export type DeliveryOrder = {
  id: string;
  retailerName: string;
  areaRoute: string;
  paymentMode: PaymentMode;
  packedQuantity: number;
  deliveredQuantity: number;
  expectedCodAmount: number;
  collectedAmount: number;
  shortCollectionReason: string;
  deliveryStatus: DeliveryStatus;
  lifecycleState: "OUT_FOR_DELIVERY" | "DELIVERED" | "PARTIALLY_DELIVERED" | "DELIVERY_FAILED";
  paymentStatus: PaymentStatus;
  dispatchBatchId: string;
  deliveryAgentId: string;
};

export type DeliveryBatchOption = {
  id: string;
  label: string;
};

export type DeliveryAgentOption = {
  id: string;
  label: string;
};

export type DeliveryResultUpdate = {
  orderId: string;
  deliveredQuantity: number;
  deliveryStatus: DeliveryStatus;
  lifecycleState: DeliveryOrder["lifecycleState"];
  paymentStatus: PaymentStatus;
  cod: {
    expectedAmount: number;
    collectedAmount: number;
    shortCollectionReason: string;
  } | null;
};

export type SaveDeliveryUpdatesPayload = {
  filterType: DeliveryFilterType;
  filterId: string;
  updates: DeliveryResultUpdate[];
};

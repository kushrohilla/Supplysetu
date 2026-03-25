export type PackingOrderStatus = "CONFIRMED" | "PARTIALLY_CONFIRMED" | "READY_TO_DISPATCH";

export type PackingPriority = "LOW" | "MEDIUM" | "HIGH";

export type PackingLineItem = {
  id: string;
  skuCode: string;
  skuName: string;
  confirmedQuantity: number;
  pickedQuantity: number;
  shortageFlag: boolean;
  availableStock: number;
};

export type PackingOrder = {
  id: string;
  retailerName: string;
  priority: PackingPriority;
  status: PackingOrderStatus;
  lineItems: PackingLineItem[];
};

export type SkuAggregate = {
  skuCode: string;
  skuName: string;
  totalRequiredQuantity: number;
  availableStock: number;
  pickedQuantity: number;
  remainingQuantity: number;
};

export type UpdatePickedQuantitiesPayload = {
  lineItems: Array<{
    lineItemId: string;
    pickedQuantity: number;
    shortageFlag: boolean;
  }>;
};

export type DispatchOrderState = "READY_TO_DISPATCH" | "OUT_FOR_DELIVERY";

export type DispatchPriority = "LOW" | "MEDIUM" | "HIGH";

export type DispatchPaymentMode = "ADVANCE" | "COD";

export type ReadyDispatchOrder = {
  id: string;
  retailerName: string;
  areaRoute: string;
  totalUnits: number;
  paymentMode: DispatchPaymentMode;
  priority: DispatchPriority;
  dispatchBatchId: string | null;
  state: DispatchOrderState;
};

export type CreateDispatchBatchPayload = {
  orderIds: string[];
  route: string;
  vehicleId: string;
  agentId: string;
  plannedDispatchDate: string;
};

export type DispatchBatchSummary = {
  batchId: string;
  totalOrders: number;
  assignedRoute: string;
  dispatchDate: string;
};

export type LogisticsResourceOption = {
  id: string;
  label: string;
};

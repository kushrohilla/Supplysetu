import { OrderActorRole } from "../domain/order-actor-role";
import { OrderStatus } from "../domain/order-status";

export type OrderWorkflowRecord = {
  id: string;
  tenantId: string;
  status: OrderStatus;
  invoiceConfirmedAt: Date | null;
  dispatchedAt: Date | null;
  deliveredAt: Date | null;
  closedAt: Date | null;
};

export type OrderTransitionAuditEntry = {
  tenantId: string;
  actorUserId: string | null;
  actorRole: OrderActorRole;
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  metadata?: Record<string, unknown>;
};

export type OrderTransitionRequest = {
  orderId: string;
  tenantId: string;
  actorUserId: string | null;
  actorRole: OrderActorRole;
  nextStatus: OrderStatus;
  metadata?: Record<string, unknown>;
};

export interface OrderWorkflowRepository {
  findById(orderId: string, tenantId: string): Promise<OrderWorkflowRecord | null>;
  updateStatus(params: {
    orderId: string;
    tenantId: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    patch: Partial<Pick<OrderWorkflowRecord, "invoiceConfirmedAt" | "dispatchedAt" | "deliveredAt" | "closedAt">>;
  }): Promise<OrderWorkflowRecord>;
}

export interface OrderAuditTrailRepository {
  logTransition(entry: OrderTransitionAuditEntry): Promise<void>;
}

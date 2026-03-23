import { randomUUID } from "node:crypto";

import { Knex } from "knex";

import { AppError } from "../../../shared/errors/app-error";
import { db } from "../../../database/knex";
import { OrderActorRole } from "../domain/order-actor-role";
import { OrderStatus } from "../domain/order-status";
import {
  OrderAuditTrailRepository,
  OrderTransitionAuditEntry,
  OrderWorkflowRecord,
  OrderWorkflowRepository
} from "../application/order-transition.types";

type OrderRow = {
  id: string;
  tenant_id: string;
  status: OrderStatus;
  invoice_confirmed_at: Date | null;
  dispatched_at: Date | null;
  delivered_at: Date | null;
  closed_at: Date | null;
};

const mapOrderRow = (row: OrderRow): OrderWorkflowRecord => {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    status: row.status,
    invoiceConfirmedAt: row.invoice_confirmed_at,
    dispatchedAt: row.dispatched_at,
    deliveredAt: row.delivered_at,
    closedAt: row.closed_at
  };
};

const mapActorRole = (actorRole: OrderActorRole) => actorRole;

export const createKnexOrderWorkflowRepository = (
  connection: Knex = db
): OrderWorkflowRepository => {
  return {
    async findById(orderId, tenantId) {
      const row = await connection<OrderRow>("orders")
        .select("*")
        .where({
          id: orderId,
          tenant_id: tenantId
        })
        .first();

      return row ? mapOrderRow(row) : null;
    },

    async updateStatus({ orderId, tenantId, fromStatus, toStatus, patch }) {
      const updatePayload = {
        status: toStatus,
        invoice_confirmed_at: patch.invoiceConfirmedAt ?? undefined,
        dispatched_at: patch.dispatchedAt ?? undefined,
        delivered_at: patch.deliveredAt ?? undefined,
        closed_at: patch.closedAt ?? undefined,
        updated_at: connection.fn.now()
      };

      const [row] = await connection<OrderRow>("orders")
        .where({
          id: orderId,
          tenant_id: tenantId,
          status: fromStatus
        })
        .update(updatePayload)
        .returning(["id", "tenant_id", "status", "invoice_confirmed_at", "dispatched_at", "delivered_at", "closed_at"]);

      if (!row) {
        throw new AppError(
          "Order status update failed because the current status no longer matches",
          409,
          "ORDER_STATUS_CONFLICT",
          {
            orderId,
            tenantId,
            expectedStatus: fromStatus,
            requestedStatus: toStatus
          }
        );
      }

      return mapOrderRow(row);
    }
  };
};

export const createKnexOrderAuditTrailRepository = (
  connection: Knex = db
): OrderAuditTrailRepository => {
  return {
    async logTransition(entry: OrderTransitionAuditEntry) {
      await connection("audit_logs").insert({
        id: randomUUID(),
        tenant_id: entry.tenantId,
        actor_user_id: entry.actorUserId,
        actor_role: mapActorRole(entry.actorRole),
        entity_type: "order",
        entity_id: entry.orderId,
        action: "order.status_transition",
        metadata: {
          fromStatus: entry.fromStatus,
          toStatus: entry.toStatus,
          ...entry.metadata
        }
      });
    }
  };
};

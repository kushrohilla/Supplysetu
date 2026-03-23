import { AppError } from "../../../shared/errors/app-error";
import { logger } from "../../../shared/logger";

import {
  assertAuthorizedOrderTransition,
  assertNoDuplicateTerminalUpdate,
  assertValidOrderTransition
} from "../domain/order-transition-rules";
import { OrderStatus } from "../domain/order-status";
import {
  OrderAuditTrailRepository,
  OrderTransitionRequest,
  OrderWorkflowRecord,
  OrderWorkflowRepository
} from "./order-transition.types";

type OrderTransitionServiceDeps = {
  orderRepository: OrderWorkflowRepository;
  auditTrailRepository: OrderAuditTrailRepository;
  now?: () => Date;
};

const getStatusPatch = (nextStatus: OrderStatus, now: Date) => {
  switch (nextStatus) {
    case "invoiced":
      return { invoiceConfirmedAt: now };
    case "dispatched":
      return { dispatchedAt: now };
    case "delivered":
      return { deliveredAt: now };
    case "closed":
      return { closedAt: now };
    default:
      return {};
  }
};

const assertTransitionSafeguards = (order: OrderWorkflowRecord, nextStatus: OrderStatus): void => {
  assertNoDuplicateTerminalUpdate(order.status, nextStatus);

  if (nextStatus === "invoiced" && order.invoiceConfirmedAt) {
    throw new AppError(
      "Invoice confirmation has already been recorded for this order",
      409,
      "DUPLICATE_INVOICE_CONFIRMATION",
      {
        currentStatus: order.status,
        requestedStatus: nextStatus,
        invoiceConfirmedAt: order.invoiceConfirmedAt.toISOString()
      }
    );
  }

  if (nextStatus === "dispatched" && order.status !== "invoiced") {
    throw new AppError(
      "Order cannot be dispatched before invoice confirmation",
      409,
      "DISPATCH_BEFORE_INVOICE",
      {
        currentStatus: order.status,
        requestedStatus: nextStatus
      }
    );
  }

  if (nextStatus === "closed" && order.status !== "delivered") {
    throw new AppError(
      "Order cannot be closed before delivery confirmation",
      409,
      "CLOSE_BEFORE_DELIVERED",
      {
        currentStatus: order.status,
        requestedStatus: nextStatus
      }
    );
  }
};

export const createOrderTransitionService = ({
  orderRepository,
  auditTrailRepository,
  now = () => new Date()
}: OrderTransitionServiceDeps) => {
  return {
    async transitionOrder(request: OrderTransitionRequest): Promise<OrderWorkflowRecord> {
      const order = await orderRepository.findById(request.orderId, request.tenantId);

      if (!order) {
        throw new AppError("Order not found", 404, "ORDER_NOT_FOUND", {
          orderId: request.orderId,
          tenantId: request.tenantId
        });
      }

      assertTransitionSafeguards(order, request.nextStatus);
      assertValidOrderTransition(order.status, request.nextStatus);
      assertAuthorizedOrderTransition(request.actorRole, order.status, request.nextStatus);

      const transitionTime = now();
      const updatedOrder = await orderRepository.updateStatus({
        orderId: request.orderId,
        tenantId: request.tenantId,
        fromStatus: order.status,
        toStatus: request.nextStatus,
        patch: getStatusPatch(request.nextStatus, transitionTime)
      });

      await auditTrailRepository.logTransition({
        tenantId: request.tenantId,
        actorUserId: request.actorUserId,
        actorRole: request.actorRole,
        orderId: request.orderId,
        fromStatus: order.status,
        toStatus: request.nextStatus,
        metadata: {
          ...request.metadata,
          transitionAt: transitionTime.toISOString()
        }
      });

      logger.info(
        {
          orderId: request.orderId,
          tenantId: request.tenantId,
          actorRole: request.actorRole,
          fromStatus: order.status,
          toStatus: request.nextStatus
        },
        "Order status transitioned"
      );

      return updatedOrder;
    }
  };
};

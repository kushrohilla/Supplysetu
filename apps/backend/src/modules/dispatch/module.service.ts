import type { Knex } from "knex";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import type { NotificationsService } from "../notifications/module.service";
import { ORDER_STATUS, canTransitionOrderStatus, type OrderStatus } from "../order/order-status";
import type { OrderRepository } from "../order/module.repository";
import type {
  CreateDispatchBatchInput,
  CreateRouteInput,
  DeliverySheetRecord,
  DispatchBatchListRecord,
  DispatchBatchRecord,
  DispatchRepository,
  DispatchRouteRecord,
} from "./module.repository";

const BATCHABLE_ORDER_STATUSES = [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PACKED] as const;

export class DispatchService {
  constructor(
    private readonly db: Knex,
    private readonly dispatchRepository: DispatchRepository,
    private readonly orderRepository: OrderRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createRoute(input: CreateRouteInput): Promise<DispatchRouteRecord> {
    return this.db.transaction(async (trx) => {
      const linkedRetailers = await this.dispatchRepository.listLinkedRetailersByIds(input.tenantId, input.retailerIds, trx);
      if (linkedRetailers.length !== input.retailerIds.length) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, "RETAILER_NOT_FOUND", "One or more retailers are not linked to this tenant");
      }

      return this.dispatchRepository.createRouteWithRetailers(input, trx);
    });
  }

  async listRoutes(tenantId: string) {
    return this.dispatchRepository.listRoutes(tenantId);
  }

  async assignRouteRetailers(input: { tenantId: string; routeId: string; retailerIds: string[] }) {
    return this.db.transaction(async (trx) => {
      const route = await this.dispatchRepository.getRouteById(input.tenantId, input.routeId, trx);
      if (!route) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, "ROUTE_NOT_FOUND", "Route not found");
      }

      const linkedRetailers = await this.dispatchRepository.listLinkedRetailersByIds(input.tenantId, input.retailerIds, trx);
      if (linkedRetailers.length !== input.retailerIds.length) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, "RETAILER_NOT_FOUND", "One or more retailers are not linked to this tenant");
      }

      // Replace-all keeps route sequence explicit and avoids hidden append order.
      await this.dispatchRepository.replaceRouteRetailers(input.tenantId, input.routeId, input.retailerIds, trx);

      return this.dispatchRepository.getRouteByIdWithRetailerCount(input.tenantId, input.routeId, trx);
    });
  }

  async createBatch(input: CreateDispatchBatchInput & { actorId: string | null }): Promise<DispatchBatchRecord> {
    return this.db.transaction(async (trx) => {
      const route = await this.dispatchRepository.getRouteWithRetailers(input.tenantId, input.routeId, trx);
      if (!route) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, "ROUTE_NOT_FOUND", "Route not found");
      }

      const orders = await this.dispatchRepository.listOrdersForBatch(input.tenantId, input.orderIds, trx);
      if (orders.length !== input.orderIds.length) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, "ORDER_NOT_FOUND", "One or more orders were not found");
      }

      const alreadyBatched = await this.dispatchRepository.findOpenBatchForOrders(input.tenantId, input.orderIds, trx);
      if (alreadyBatched.length > 0) {
        throw new AppError(HTTP_STATUS.CONFLICT, "ORDER_ALREADY_BATCHED", "One or more orders already belong to an open dispatch batch");
      }

      const routeRetailerIds = new Set(route.retailers.map((retailer) => retailer.retailer_id));
      for (const order of orders) {
        if (!routeRetailerIds.has(String(order.retailer_id))) {
          throw new AppError(HTTP_STATUS.CONFLICT, "ORDER_ROUTE_MISMATCH", "All orders must belong to retailers assigned to the selected route");
        }

        if (!BATCHABLE_ORDER_STATUSES.includes(order.status as (typeof BATCHABLE_ORDER_STATUSES)[number])) {
          throw new AppError(
            HTTP_STATUS.CONFLICT,
            "ORDER_NOT_ELIGIBLE_FOR_BATCH",
            "Orders must be in CONFIRMED or PACKED state before batching",
          );
        }
      }

      for (const order of orders) {
        if (order.status === ORDER_STATUS.CONFIRMED) {
          await this.transitionAdminOrderStatus(input.tenantId, String(order.id), ORDER_STATUS.INVOICED, input.actorId, trx);
          await this.transitionAdminOrderStatus(input.tenantId, String(order.id), ORDER_STATUS.PACKED, input.actorId, trx);
        }
      }

      return this.dispatchRepository.createDispatchBatch({
        tenantId: input.tenantId,
        routeId: input.routeId,
        deliveryDate: input.deliveryDate,
        orderIds: input.orderIds,
      }, trx);
    });
  }

  async listBatches(tenantId: string): Promise<DispatchBatchListRecord[]> {
    return this.dispatchRepository.listBatches(tenantId);
  }

  async getBatchSheet(tenantId: string, batchId: string): Promise<DeliverySheetRecord> {
    const sheet = await this.dispatchRepository.getBatchSheet(tenantId, batchId);
    if (!sheet) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, "DISPATCH_BATCH_NOT_FOUND", "Dispatch batch not found");
    }

    return sheet;
  }

  async dispatchBatch(input: { tenantId: string; batchId: string; actorId: string | null }): Promise<DispatchBatchRecord> {
    const result = await this.db.transaction(async (trx) => {
      const batch = await this.dispatchRepository.getBatchById(input.tenantId, input.batchId, trx);
      if (!batch) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, "DISPATCH_BATCH_NOT_FOUND", "Dispatch batch not found");
      }

      if (batch.status === "COMPLETED") {
        throw new AppError(HTTP_STATUS.CONFLICT, "BATCH_ALREADY_COMPLETED", "Completed dispatch batches cannot be dispatched again");
      }

      const batchOrders = await this.dispatchRepository.listBatchOrders(input.tenantId, input.batchId, trx);
      const dispatchedOrders = [];
      for (const batchOrder of batchOrders) {
        const order = await this.transitionAdminOrderStatus(input.tenantId, batchOrder.order_id, ORDER_STATUS.DISPATCHED, input.actorId, trx);
        dispatchedOrders.push(order);
      }

      const updated = await this.dispatchRepository.updateBatchStatus(input.tenantId, input.batchId, "DISPATCHED", trx);
      if (!updated) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, "DISPATCH_BATCH_NOT_FOUND", "Dispatch batch not found");
      }

      return {
        batch: updated,
        dispatchedOrders,
      };
    });

    for (const order of result.dispatchedOrders) {
      await this.safeDispatchNotification({
        tenantId: input.tenantId,
        eventType: "order_dispatched",
        resourceType: "order",
        resourceId: order.id,
        recipientType: "retailer",
        recipientId: order.retailer_id,
        payload: {
          orderId: order.id,
          orderNumber: order.order_number,
          totalAmount: order.total_amount,
        },
      });
    }

    return result.batch;
  }

  async deliverOrder(input: { tenantId: string; orderId: string; actorId: string | null }) {
    const result = await this.db.transaction(async (trx) => {
      const batch = await this.dispatchRepository.findBatchByOrderId(input.tenantId, input.orderId, trx);
      if (!batch) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, "DISPATCH_BATCH_NOT_FOUND", "Dispatch batch not found for order");
      }

      const order = await this.transitionAdminOrderStatus(input.tenantId, input.orderId, ORDER_STATUS.DELIVERED, input.actorId, trx);
      await this.dispatchRepository.markBatchStopsCompletedIfDelivered(input.tenantId, String(batch.id), trx);

      const batchOrders = await this.dispatchRepository.listBatchOrdersWithStatuses(input.tenantId, String(batch.id), trx);
      const allDelivered = batchOrders.length > 0 && batchOrders.every((batchOrder) => batchOrder.status === ORDER_STATUS.DELIVERED);
      const updatedBatch = allDelivered
        ? await this.dispatchRepository.updateBatchStatus(input.tenantId, String(batch.id), "COMPLETED", trx)
        : await this.dispatchRepository.getBatchById(input.tenantId, String(batch.id), trx);

      return {
        order,
        batch: updatedBatch,
      };
    });

    await this.safeDispatchNotification({
      tenantId: input.tenantId,
      eventType: "order_delivered",
      resourceType: "order",
      resourceId: result.order.id,
      recipientType: "retailer",
      recipientId: result.order.retailer_id,
      payload: {
        orderId: result.order.id,
        orderNumber: result.order.order_number,
        totalAmount: result.order.total_amount,
      },
    });

    return result;
  }

  private async transitionAdminOrderStatus(
    tenantId: string,
    orderId: string,
    nextStatus: OrderStatus,
    actorId: string | null,
    trx: Knex.Transaction,
  ) {
    const order = await this.orderRepository.getOrderById(tenantId, orderId, trx);
    if (!order) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, "ORDER_NOT_FOUND", "Order not found");
    }

    if (!canTransitionOrderStatus(order.status, nextStatus)) {
      throw new AppError(
        HTTP_STATUS.CONFLICT,
        "INVALID_TRANSITION",
        `Cannot transition order from ${order.status} to ${nextStatus}`,
      );
    }

    const updated = await this.orderRepository.updateStatus(tenantId, orderId, nextStatus, trx);
    if (!updated) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, "ORDER_NOT_FOUND", "Order not found");
    }

    await this.orderRepository.createHistoryEntry({
      order_id: orderId,
      from_status: order.status,
      to_status: nextStatus,
      actor_role: "admin",
      actor_id: actorId,
    }, trx);

    return updated;
  }

  private async safeDispatchNotification(input: {
    tenantId: string;
    eventType: "order_dispatched" | "order_delivered";
    resourceType: "order";
    resourceId: string;
    recipientType: "retailer";
    recipientId: string;
    payload: {
      orderId: string;
      orderNumber: string;
      totalAmount: number;
    };
  }) {
    try {
      await this.notificationsService.dispatchOperationalEvent(input);
    } catch {
      // Notification failures must never block the source dispatch workflow.
    }
  }
}

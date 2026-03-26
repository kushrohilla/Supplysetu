import type { Request, Response } from "express";

import type { OrderService } from "./order.service";
import {
  createOrderSchema,
  listOrdersQuerySchema,
  orderParamsSchema,
  recentOrdersQuerySchema,
  reorderOrderSchema,
  updateOrderStatusParamsSchema,
  updateOrderStatusSchema,
} from "./order.schema";

export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  async listOrders(req: Request, res: Response): Promise<void> {
    const query = listOrdersQuerySchema.parse(req.query);
    const orders = await this.orderService.listOrders(query);
    res.status(200).json({ data: orders });
  }

  async getOrderById(req: Request, res: Response): Promise<void> {
    const { orderId } = orderParamsSchema.parse(req.params);
    const order = await this.orderService.getOrderById(orderId);
    res.status(200).json({ data: order });
  }

  async createOrder(req: Request, res: Response): Promise<void> {
    const input = createOrderSchema.parse(req.body);
    const createdOrder = await this.orderService.createOrder(input);
    res.status(201).json({ data: createdOrder });
  }

  async getRecentOrders(req: Request, res: Response): Promise<void> {
    const query = recentOrdersQuerySchema.parse(req.query);
    const recentOrders = await this.orderService.getRecentOrders(query);
    res.status(200).json({ data: recentOrders });
  }

  async reorderOrder(req: Request, res: Response): Promise<void> {
    const { orderId } = orderParamsSchema.parse(req.params);
    const input = reorderOrderSchema.parse(req.body);
    const draftOrder = await this.orderService.reorderOrder(orderId, input);
    res.status(201).json({ data: draftOrder });
  }

  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    const { id } = updateOrderStatusParamsSchema.parse(req.params);
    const payload = updateOrderStatusSchema.parse(req.body);
    const result = await this.orderService.transitionOrderStatus(id, payload.status);
    res.status(200).json({ data: result });
  }
}

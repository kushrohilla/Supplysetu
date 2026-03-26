import { Router } from "express";
import type { Knex } from "knex";

import { OrderController } from "./order.controller";
import { OrderRepository } from "./order.repository";
import { OrderService } from "./order.service";

export const createOrderRouter = (db: Knex): Router => {
  const router = Router();
  const orderRepository = new OrderRepository(db);
  const orderService = new OrderService(orderRepository);
  const orderController = new OrderController(orderService);

  router.get("/recent", (req, res, next) => {
    orderController.getRecentOrders(req, res).catch(next);
  });

  router.post("/reorder/:orderId", (req, res, next) => {
    orderController.reorderOrder(req, res).catch(next);
  });

  router.get("/", (req, res, next) => {
    orderController.listOrders(req, res).catch(next);
  });

  router.get("/:orderId", (req, res, next) => {
    orderController.getOrderById(req, res).catch(next);
  });

  router.post("/", (req, res, next) => {
    orderController.createOrder(req, res).catch(next);
  });

  router.patch("/:id/status", (req, res, next) => {
    orderController.updateOrderStatus(req, res).catch(next);
  });

  return router;
};

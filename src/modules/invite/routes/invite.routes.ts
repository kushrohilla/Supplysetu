import { Router } from "express";
import type { Knex } from "knex";
import { InviteController } from "../controllers/InviteController";

export const createInviteRouter = (db: Knex): Router => {
  const router = Router();
  const controller = new InviteController(db);

  router.get("/public/invite/validate", (req, res) => controller.validateInvite(req, res));
  router.post("/retailer/network/join", (req, res) => controller.joinNetwork(req, res));
  router.get("/retailer/network/list", (req, res) => controller.listRetailerNetwork(req, res));

  router.get("/admin/invite/current", (req, res) => controller.getTenantInvite(req, res));
  router.post("/admin/invite/generate", (req, res) => controller.generateTenantInvite(req, res));
  router.get("/admin/invite/joined-retailers", (req, res) =>
    controller.getTenantJoinedRetailers(req, res)
  );

  return router;
};

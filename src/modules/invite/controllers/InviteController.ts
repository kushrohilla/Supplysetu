import type { Request, Response } from "express";
import type { Knex } from "knex";
import { InviteService } from "../services/InviteService";

const parseInviteError = (error: unknown): { status: number; message: string } => {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

  if (message === "INVALID_CODE") {
    return { status: 404, message: "Invite code is invalid" };
  }

  if (message === "TENANT_SUSPENDED") {
    return { status: 403, message: "Distributor is suspended" };
  }

  if (message === "TENANT_NOT_FOUND") {
    return { status: 404, message: "Tenant not found" };
  }

  return { status: 500, message: "Invite operation failed" };
};

export class InviteController {
  private readonly inviteService: InviteService;

  constructor(db: Knex) {
    this.inviteService = new InviteService(db);
  }

  async validateInvite(req: Request, res: Response): Promise<void> {
    const inviteCode = String(req.query.code ?? "").trim();
    if (!inviteCode) {
      res.status(400).json({ error: "Invite code is required" });
      return;
    }

    try {
      const invite = await this.inviteService.validateInviteCode(inviteCode);
      res.status(200).json({
        distributor_name: invite.distributorName,
        distributor_logo_url: invite.distributorLogoUrl,
        service_city: invite.serviceCity
      });
    } catch (error) {
      const parsed = parseInviteError(error);
      res.status(parsed.status).json({ error: parsed.message });
    }
  }

  async joinNetwork(req: Request, res: Response): Promise<void> {
    const inviteCode = String(req.body.invite_code ?? "").trim();
    const retailerUserId = String(req.body.retailer_user_id ?? req.body.retailerUserId ?? "").trim();
    const joinSource =
      req.body.join_source === "qr_scan" || req.body.join_source === "manual_code"
        ? req.body.join_source
        : "invite_link";

    if (!inviteCode || !retailerUserId) {
      res.status(400).json({ error: "invite_code and retailer_user_id are required" });
      return;
    }

    try {
      const joined = await this.inviteService.joinRetailerNetwork({
        inviteCode,
        retailerUserId,
        joinSource
      });
      res.status(200).json(joined);
    } catch (error) {
      const parsed = parseInviteError(error);
      res.status(parsed.status).json({ error: parsed.message });
    }
  }

  async listRetailerNetwork(req: Request, res: Response): Promise<void> {
    const fromAuth = (req as Request & { retailer?: { id?: string | number } }).retailer?.id;
    const retailerUserId = String(fromAuth ?? req.query.retailer_user_id ?? "").trim();

    if (!retailerUserId) {
      res.status(400).json({ error: "retailer_user_id is required" });
      return;
    }

    try {
      const list = await this.inviteService.getRetailerNetworkList(retailerUserId);
      res.status(200).json({ items: list });
    } catch {
      res.status(500).json({ error: "Failed to fetch retailer network list" });
    }
  }

  async generateTenantInvite(req: Request, res: Response): Promise<void> {
    const tenantId = String(req.body.tenant_id ?? req.query.tenant_id ?? "").trim();
    const createdByUser = String(req.body.created_by_user ?? "").trim() || undefined;

    if (!tenantId) {
      res.status(400).json({ error: "tenant_id is required" });
      return;
    }

    try {
      const invite = await this.inviteService.generateInviteCodeForTenant(tenantId, createdByUser);
      res.status(200).json(invite);
    } catch (error) {
      const parsed = parseInviteError(error);
      res.status(parsed.status).json({ error: parsed.message });
    }
  }

  async getTenantInvite(req: Request, res: Response): Promise<void> {
    const tenantId = String(req.query.tenant_id ?? "").trim();
    if (!tenantId) {
      res.status(400).json({ error: "tenant_id is required" });
      return;
    }

    try {
      const invite = await this.inviteService.generateInviteCodeForTenant(tenantId);
      res.status(200).json(invite);
    } catch (error) {
      const parsed = parseInviteError(error);
      res.status(parsed.status).json({ error: parsed.message });
    }
  }

  async getTenantJoinedRetailers(req: Request, res: Response): Promise<void> {
    const tenantId = String(req.query.tenant_id ?? "").trim();
    if (!tenantId) {
      res.status(400).json({ error: "tenant_id is required" });
      return;
    }

    try {
      const list = await this.inviteService.getTenantJoinedRetailers(tenantId);
      res.status(200).json({ items: list });
    } catch (error) {
      const parsed = parseInviteError(error);
      res.status(parsed.status).json({ error: parsed.message });
    }
  }
}

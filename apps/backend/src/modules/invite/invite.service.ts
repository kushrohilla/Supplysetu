import crypto from "crypto";
import type { Knex } from "knex";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import type { DistributorInviteRecord, InviteRepository } from "./invite.repository";

const INVITE_LIFETIME_MS = 24 * 60 * 60 * 1000;

export class InviteService {
  private readonly db: Knex | null;
  private readonly inviteRepository: InviteRepository;

  constructor(
    dbOrRepository: Knex | InviteRepository,
    maybeInviteRepository?: InviteRepository,
  ) {
    this.db = maybeInviteRepository ? (dbOrRepository as Knex) : null;
    this.inviteRepository = (maybeInviteRepository ?? dbOrRepository) as InviteRepository;
  }

  async createInvite(tenantId: string) {
    const invite = await this.inviteRepository.createInvite({
      tenant_id: tenantId,
      invite_token: crypto.randomBytes(32).toString("hex"),
      expires_at: new Date(Date.now() + INVITE_LIFETIME_MS),
      is_used: false,
    });

    if (!invite) {
      throw new AppError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "INVITE_CREATE_FAILED", "Invite could not be created");
    }

    return {
      invite_link: this.buildInviteLink(invite.invite_token),
    };
  }

  async validateInvite(token: string) {
    const invite = await this.inviteRepository.getInviteByToken(token);
    if (!this.isInviteUsable(invite)) {
      return { valid: false as const };
    }

    return {
      valid: true as const,
      distributor: {
        name: invite.distributor_name ?? "Distributor",
      },
    };
  }

  async acceptInvite(retailerId: string, token: string) {
    return this.runInTransaction(async (trx) => {
      const invite = trx
        ? await this.inviteRepository.getInviteByToken(token, trx)
        : await this.inviteRepository.getInviteByToken(token);
      if (!this.isInviteUsable(invite)) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, "INVITE_NOT_FOUND", "Invite not found");
      }

      const existingLink = trx
        ? await this.inviteRepository.getRetailerDistributorLink(retailerId, invite.tenant_id, trx)
        : await this.inviteRepository.getRetailerDistributorLink(retailerId, invite.tenant_id);
      if (!existingLink) {
        if (trx) {
          await this.inviteRepository.createRetailerDistributorLink(retailerId, invite.tenant_id, trx);
        } else {
          await this.inviteRepository.createRetailerDistributorLink(retailerId, invite.tenant_id);
        }
      }

      if (trx) {
        await this.inviteRepository.markInviteUsed(invite.id, trx);
      } else {
        await this.inviteRepository.markInviteUsed(invite.id);
      }

      return {
        message: "Distributor invite accepted successfully",
      };
    });
  }

  private async runInTransaction<T>(callback: (trx?: Knex.Transaction) => Promise<T>) {
    if (this.db?.transaction) {
      return this.db.transaction(async (trx) => callback(trx));
    }

    return callback(undefined);
  }

  private buildInviteLink(token: string) {
    const baseUrl = (process.env.INVITE_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
    return `${baseUrl}/invite?token=${encodeURIComponent(token)}`;
  }

  private isInviteUsable(invite: DistributorInviteRecord | null): invite is DistributorInviteRecord {
    if (!invite || invite.is_used) {
      return false;
    }

    return new Date(invite.expires_at).getTime() > Date.now();
  }
}

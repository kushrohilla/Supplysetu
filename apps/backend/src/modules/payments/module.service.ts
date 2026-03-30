import type { Knex } from "knex";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import type {
  PaymentHistoryResult,
  PaymentMode,
  PaymentsRepository,
  PaymentRecord,
  PaymentListFilters,
  RetailerCreditLimitRecord,
  RetailerCreditSummary,
} from "./module.repository";

export type RecordPaymentInput = {
  tenantId: string;
  actorId: string | null;
  orderId: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNote?: string;
  paidAt?: string;
  idempotencyKey?: string;
};

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23505";

/**
 * Normalize and validate the paid_at date string.
 * Returns a valid ISO timestamp. Throws if the input is not a valid date.
 */
const normalizePaidAt = (paidAt: string | undefined): string => {
  if (!paidAt) {
    return new Date().toISOString();
  }

  const parsed = new Date(paidAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      "INVALID_PAID_AT",
      "paid_at must be a valid ISO 8601 datetime string.",
    );
  }

  return parsed.toISOString();
};

export class PaymentsService {
  constructor(
    private readonly db: Knex,
    private readonly paymentsRepository: PaymentsRepository,
  ) {}

  async recordPayment(input: RecordPaymentInput): Promise<PaymentRecord> {
    // Fast-path idempotency check outside transaction to avoid unnecessary locking.
    if (input.idempotencyKey) {
      const existing = await this.paymentsRepository.findPaymentByIdempotencyKey(input.tenantId, input.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    // Validate and normalize paid_at before entering the transaction.
    const normalizedPaidAt = normalizePaidAt(input.paidAt);

    try {
      return await this.db.transaction(async (trx) => {
        // Re-check idempotency inside transaction to handle races.
        if (input.idempotencyKey) {
          const existing = await this.paymentsRepository.findPaymentByIdempotencyKey(input.tenantId, input.idempotencyKey, trx);
          if (existing) {
            return existing;
          }
        }

        // Tenant-scoped order lookup — ensures cross-tenant access is impossible.
        const order = await this.paymentsRepository.findOrderForPayment(input.tenantId, input.orderId, trx);
        if (!order) {
          throw new AppError(HTTP_STATUS.NOT_FOUND, "ORDER_NOT_FOUND", "Order not found");
        }

        return this.paymentsRepository.createPaymentTransaction({
          tenantId: input.tenantId,
          retailerId: order.retailer_id,
          orderId: input.orderId,
          amount: input.amount,
          paymentMode: input.paymentMode,
          referenceNote: input.referenceNote?.trim() || null,
          paidAt: normalizedPaidAt,
          actorId: input.actorId,
          idempotencyKey: input.idempotencyKey,
        }, trx);
      });
    } catch (error) {
      // Handle unique constraint race on idempotency_key — return existing record.
      if (input.idempotencyKey && isUniqueViolation(error)) {
        const existing = await this.paymentsRepository.findPaymentByIdempotencyKey(input.tenantId, input.idempotencyKey);
        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }

  async listPayments(tenantId: string, filters: PaymentListFilters): Promise<PaymentHistoryResult> {
    return this.paymentsRepository.listPayments(tenantId, filters);
  }

  async getRetailerCreditSummary(tenantId: string, retailerId: string): Promise<RetailerCreditSummary> {
    const summary = await this.paymentsRepository.findRetailerCreditSummary(tenantId, retailerId);
    if (!summary) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, "RETAILER_NOT_FOUND", "Retailer not found");
    }

    return summary;
  }

  async updateRetailerCreditLimit(tenantId: string, retailerId: string, creditLimit: number): Promise<RetailerCreditLimitRecord> {
    const result = await this.paymentsRepository.updateRetailerCreditLimit(tenantId, retailerId, creditLimit);
    if (!result) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, "RETAILER_NOT_FOUND", "Retailer not found");
    }

    return result;
  }
}

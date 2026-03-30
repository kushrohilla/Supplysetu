import crypto from "crypto";
import type { Knex } from "knex";

import { BaseRepository } from "../../shared/base-repository";

type DbExecutor = Knex | Knex.Transaction;

type PaymentTransactionRow = {
  id: string;
  tenant_id: string;
  retailer_id: string;
  retailer_name?: string | null;
  order_id: string;
  amount_paise: number | string;
  payment_mode: "advance" | "cod" | "credit";
  reference_note?: string | null;
  paid_at: string | Date;
  created_at: string | Date;
};

type OrderPaymentRow = {
  id: string;
  tenant_id: string;
  retailer_id: string;
  retailer_name?: string | null;
  total_amount: number | string | null;
};

type OrderFinancialRow = {
  id: string;
  total_amount: number | string | null;
  payment_mode: PaymentMode | string | null;
};

type RetailerLinkRow = {
  retailer_id: string;
  retailer_name: string;
  credit_limit_paise: number | string | null;
};

export type PaymentMode = "advance" | "cod" | "credit";

export type PaymentRecord = {
  id: string;
  tenant_id: string;
  retailer_id: string;
  retailer_name: string;
  order_id: string;
  amount: number;
  payment_mode: PaymentMode;
  reference_note: string | null;
  paid_at: string;
  created_at: string;
};

export type RecordPaymentInput = {
  tenantId: string;
  retailerId: string;
  orderId: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNote: string | null;
  paidAt: string;
  actorId: string | null;
  idempotencyKey?: string;
};

export type PaymentListFilters = {
  retailer_id?: string;
  page: number;
  limit: number;
};

export type PaymentsSummary = {
  total_outstanding: number;
  advance_collected_today: number;
  cod_pending: number;
};

export type PaymentHistoryResult = {
  items: PaymentRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  summary: PaymentsSummary;
};

export type RetailerCreditSummary = {
  credit_limit: number;
  current_outstanding: number;
  advance_balance: number;
  /**
   * Simplified rule: overdue_amount = current_outstanding.
   *
   * A true overdue calculation requires invoice due-dates or payment terms,
   * which the current schema does not support. This field equals
   * current_outstanding so downstream consumers have a named "overdue"
   * field ready for refinement when payment-term support is added.
   */
  overdue_amount: number;
  last_payment_date: string | null;
};

export type RetailerCreditLimitRecord = {
  retailer_id: string;
  credit_limit: number;
};

export type PaymentSummaryOrderInput = {
  id: string;
  total_amount: number | string | null;
  payment_mode: PaymentMode | string | null;
};

export type PaymentCalculationInput = {
  order_id: string;
  amount_paise: number | string | null;
  payment_mode: PaymentMode | string;
  paid_at: string | Date;
};

/**
 * Convert a DB decimal rupee value (e.g. "125.50") to integer paise (12550).
 * Returns 0 for null/undefined.
 */
const decimalRupeesToPaise = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  const normalized = typeof value === "number" ? value.toFixed(2) : String(value);
  const [wholePart, decimalPart = ""] = normalized.split(".");
  const isNegative = wholePart.startsWith("-");
  const wholeDigits = wholePart.replace("-", "");
  const paise = Number(wholeDigits || "0") * 100 + Number((decimalPart + "00").slice(0, 2));

  return isNegative ? -paise : paise;
};

/**
 * Safely coerce a DB numeric value to a JS number, returning 0 for null/undefined.
 */
const normalizePaise = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
};

const toIsoString = (value: string | Date): string => new Date(value).toISOString();

const normalizeDate = (value: string | Date): number => new Date(value).getTime();

/**
 * Compute per-order outstanding by subtracting payments from order totals.
 * Outstanding is clamped to >= 0 (overpayment does not create negative outstanding).
 */
const getOutstandingByOrder = (
  orders: PaymentSummaryOrderInput[],
  payments: PaymentCalculationInput[],
) => {
  const orderTotals = new Map<string, { total: number; payment_mode: PaymentMode | string | null }>();
  for (const order of orders) {
    orderTotals.set(String(order.id), {
      total: normalizePaise(order.total_amount),
      payment_mode: order.payment_mode,
    });
  }

  const paymentsByOrder = new Map<string, number>();
  for (const payment of payments) {
    const orderId = String(payment.order_id);
    paymentsByOrder.set(orderId, (paymentsByOrder.get(orderId) ?? 0) + normalizePaise(payment.amount_paise));
  }

  return [...orderTotals.entries()].map(([orderId, order]) => ({
    order_id: orderId,
    payment_mode: order.payment_mode,
    outstanding: Math.max(order.total - (paymentsByOrder.get(orderId) ?? 0), 0),
    total: order.total,
  }));
};

const getLastPaymentDate = (payments: PaymentCalculationInput[]): string | Date | null => {
  if (payments.length === 0) {
    return null;
  }

  return payments
    .slice()
    .sort((left, right) => normalizeDate(right.paid_at) - normalizeDate(left.paid_at))[0]?.paid_at ?? null;
};

/**
 * Derive a retailer's credit summary from raw order + payment records.
 *
 * Rules:
 * - current_outstanding = max(totalOrderValue - totalPayments, 0)
 * - advance_balance     = max(totalPayments - totalOrderValue, 0)
 * - overdue_amount      = current_outstanding  (simplified; no payment-term support yet)
 *
 * Both current_outstanding and advance_balance are clamped to >= 0 to avoid
 * misleading negative values when data is sparse or asymmetric.
 */
export const calculateRetailerCreditSummary = ({
  creditLimitPaise,
  orders,
  payments,
}: {
  creditLimitPaise: number;
  orders: PaymentSummaryOrderInput[];
  payments: PaymentCalculationInput[];
}): RetailerCreditSummary => {
  const totalOrderValue = orders.reduce((sum, order) => sum + normalizePaise(order.total_amount), 0);
  const totalPayments = payments.reduce((sum, payment) => sum + normalizePaise(payment.amount_paise), 0);

  // Clamp to zero — negative outstanding or advance is not meaningful.
  const currentOutstanding = Math.max(totalOrderValue - totalPayments, 0);
  const advanceBalance = Math.max(totalPayments - totalOrderValue, 0);
  const lastPaymentDate = getLastPaymentDate(payments);

  return {
    credit_limit: creditLimitPaise,
    current_outstanding: currentOutstanding,
    advance_balance: advanceBalance,
    // Simplified rule: overdue = outstanding until payment-term schema is added.
    overdue_amount: currentOutstanding,
    last_payment_date: lastPaymentDate ? toIsoString(lastPaymentDate) : null,
  };
};

/**
 * Derive the global payments summary (for the list page summary cards).
 *
 * Rules:
 * - total_outstanding        = sum of per-order outstanding (clamped >= 0 per order)
 * - advance_collected_today  = sum of advance-mode payments with paid_at within today
 * - cod_pending              = sum of outstanding on cod-mode orders only
 */
export const calculatePaymentsSummary = ({
  orders,
  payments,
  now = new Date(),
}: {
  orders: PaymentSummaryOrderInput[];
  payments: PaymentCalculationInput[];
  now?: Date;
}): PaymentsSummary => {
  const outstandingByOrder = getOutstandingByOrder(orders, payments);
  const totalOutstanding = outstandingByOrder.reduce((sum, order) => sum + order.outstanding, 0);

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const advanceCollectedToday = payments
    .filter(
      (payment) =>
        payment.payment_mode === "advance" &&
        normalizeDate(payment.paid_at) >= startOfToday.getTime() &&
        normalizeDate(payment.paid_at) <= endOfToday.getTime(),
    )
    .reduce((sum, payment) => sum + normalizePaise(payment.amount_paise), 0);

  const codPending = outstandingByOrder
    .filter((order) => order.payment_mode === "cod" && order.outstanding > 0)
    .reduce((sum, order) => sum + order.outstanding, 0);

  return {
    total_outstanding: totalOutstanding,
    advance_collected_today: advanceCollectedToday,
    cod_pending: codPending,
  };
};

export class PaymentsRepository extends BaseRepository {
  async findPaymentByIdempotencyKey(tenantId: string, idempotencyKey: string, db: DbExecutor = this.db): Promise<PaymentRecord | null> {
    const row = await db("payment_transactions")
      .join("retailers", "payment_transactions.retailer_id", "retailers.id")
      .where("payment_transactions.tenant_id", tenantId)
      .andWhere("payment_transactions.idempotency_key", idempotencyKey)
      .first<PaymentTransactionRow>(
        "payment_transactions.id",
        "payment_transactions.tenant_id",
        "payment_transactions.retailer_id",
        "retailers.name as retailer_name",
        "payment_transactions.order_id",
        "payment_transactions.amount_paise",
        "payment_transactions.payment_mode",
        "payment_transactions.reference_note",
        "payment_transactions.paid_at",
        "payment_transactions.created_at",
      );

    return row ? this.mapPayment(row) : null;
  }

  async findOrderForPayment(tenantId: string, orderId: string, db: DbExecutor = this.db) {
    const row = await db("orders")
      .leftJoin("retailers", "orders.retailer_id", "retailers.id")
      .where("orders.tenant_id", tenantId)
      .andWhere("orders.id", orderId)
      .first<OrderPaymentRow>(
        "orders.id",
        "orders.tenant_id",
        "orders.retailer_id",
        "orders.total_amount",
        "retailers.name as retailer_name",
      );

    if (!row) {
      return null;
    }

    return {
      id: String(row.id),
      tenant_id: String(row.tenant_id),
      retailer_id: String(row.retailer_id),
      retailer_name: row.retailer_name ?? "Unknown retailer",
      total_amount: decimalRupeesToPaise(row.total_amount),
    };
  }

  async createPaymentTransaction(input: RecordPaymentInput, db: DbExecutor = this.db): Promise<PaymentRecord> {
    const id = crypto.randomUUID();

    await db("payment_transactions").insert({
      id,
      tenant_id: input.tenantId,
      retailer_id: input.retailerId,
      order_id: input.orderId,
      amount_paise: input.amount,
      payment_mode: input.paymentMode,
      reference_note: input.referenceNote,
      paid_at: input.paidAt,
      idempotency_key: input.idempotencyKey ?? null,
      recorded_by_user_id: input.actorId,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return this.getPaymentById(input.tenantId, id, db) as Promise<PaymentRecord>;
  }

  async listPayments(tenantId: string, filters: PaymentListFilters, db: DbExecutor = this.db): Promise<PaymentHistoryResult> {
    // BUG FIX: use `db` parameter consistently (was using `this.db` for baseQuery
    // while the rest of the method may operate inside a transaction).
    const baseQuery = db("payment_transactions")
      .where("payment_transactions.tenant_id", tenantId)
      .modify((builder) => {
        if (filters.retailer_id) {
          builder.andWhere("payment_transactions.retailer_id", filters.retailer_id);
        }
      });

    const totalRow = await baseQuery.clone().count<{ count: string }>({ count: "*" }).first();
    const total = Number(totalRow?.count ?? 0);

    const itemRows = await baseQuery
      .clone()
      .join("retailers", "payment_transactions.retailer_id", "retailers.id")
      .orderBy("payment_transactions.paid_at", "desc")
      .orderBy("payment_transactions.created_at", "desc")
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit)
      .select<PaymentTransactionRow[]>(
        "payment_transactions.id",
        "payment_transactions.tenant_id",
        "payment_transactions.retailer_id",
        "retailers.name as retailer_name",
        "payment_transactions.order_id",
        "payment_transactions.amount_paise",
        "payment_transactions.payment_mode",
        "payment_transactions.reference_note",
        "payment_transactions.paid_at",
        "payment_transactions.created_at",
      );

    const summary = await this.getPaymentsSummary(tenantId, filters.retailer_id, db);

    return {
      items: itemRows.map((row) => this.mapPayment(row)),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        total_pages: total === 0 ? 0 : Math.ceil(total / filters.limit),
      },
      summary,
    };
  }

  async findRetailerCreditSummary(tenantId: string, retailerId: string, db: DbExecutor = this.db): Promise<RetailerCreditSummary | null> {
    const retailerLink = await this.findRetailerLink(tenantId, retailerId, db);
    if (!retailerLink) {
      return null;
    }

    const orders = await this.listOrderFinancials(tenantId, retailerId, db);
    const payments = await this.listPaymentFinancials(tenantId, retailerId, db);

    return calculateRetailerCreditSummary({
      creditLimitPaise: Number(retailerLink.credit_limit_paise ?? 0),
      orders,
      payments,
    });
  }

  async updateRetailerCreditLimit(
    tenantId: string,
    retailerId: string,
    creditLimit: number,
    db: DbExecutor = this.db,
  ): Promise<RetailerCreditLimitRecord | null> {
    const updatedCount = await db("retailer_distributor_links")
      .where({
        tenant_id: tenantId,
        retailer_id: retailerId,
      })
      .update({
        credit_limit_paise: creditLimit,
        updated_at: db.fn.now(),
      });

    if (!updatedCount) {
      return null;
    }

    return {
      retailer_id: retailerId,
      credit_limit: creditLimit,
    };
  }

  private async getPaymentById(tenantId: string, paymentId: string, db: DbExecutor = this.db): Promise<PaymentRecord | null> {
    const row = await db("payment_transactions")
      .join("retailers", "payment_transactions.retailer_id", "retailers.id")
      .where("payment_transactions.tenant_id", tenantId)
      .andWhere("payment_transactions.id", paymentId)
      .first<PaymentTransactionRow>(
        "payment_transactions.id",
        "payment_transactions.tenant_id",
        "payment_transactions.retailer_id",
        "retailers.name as retailer_name",
        "payment_transactions.order_id",
        "payment_transactions.amount_paise",
        "payment_transactions.payment_mode",
        "payment_transactions.reference_note",
        "payment_transactions.paid_at",
        "payment_transactions.created_at",
      );

    return row ? this.mapPayment(row) : null;
  }

  private async findRetailerLink(tenantId: string, retailerId: string, db: DbExecutor = this.db): Promise<RetailerLinkRow | null> {
    const row = await db("retailer_distributor_links")
      .join("retailers", "retailer_distributor_links.retailer_id", "retailers.id")
      .where("retailer_distributor_links.tenant_id", tenantId)
      .andWhere("retailer_distributor_links.retailer_id", retailerId)
      .andWhere("retailers.is_active", true)
      .first<RetailerLinkRow>(
        "retailer_distributor_links.retailer_id",
        "retailers.name as retailer_name",
        "retailer_distributor_links.credit_limit_paise",
      );

    return row ?? null;
  }

  private async listOrderFinancials(tenantId: string, retailerId?: string, db: DbExecutor = this.db) {
    const rows = await db("orders")
      .where("orders.tenant_id", tenantId)
      .modify((builder) => {
        if (retailerId) {
          builder.andWhere("orders.retailer_id", retailerId);
        }
      })
      .select<OrderFinancialRow[]>("orders.id", "orders.total_amount", "orders.payment_mode");

    return rows.map((row) => ({
      id: String(row.id),
      total_amount: decimalRupeesToPaise(row.total_amount),
      payment_mode: row.payment_mode ?? "cod",
    }));
  }

  private async listPaymentFinancials(tenantId: string, retailerId?: string, db: DbExecutor = this.db) {
    return db("payment_transactions")
      .where("payment_transactions.tenant_id", tenantId)
      .modify((builder) => {
        if (retailerId) {
          builder.andWhere("payment_transactions.retailer_id", retailerId);
        }
      })
      .select<PaymentTransactionRow[]>(
        "payment_transactions.id",
        "payment_transactions.tenant_id",
        "payment_transactions.retailer_id",
        "payment_transactions.order_id",
        "payment_transactions.amount_paise",
        "payment_transactions.payment_mode",
        "payment_transactions.reference_note",
        "payment_transactions.paid_at",
        "payment_transactions.created_at",
      );
  }

  private async getPaymentsSummary(tenantId: string, retailerId?: string, db: DbExecutor = this.db): Promise<PaymentsSummary> {
    const [orders, payments] = await Promise.all([
      this.listOrderFinancials(tenantId, retailerId, db),
      this.listPaymentFinancials(tenantId, retailerId, db),
    ]);

    return calculatePaymentsSummary({
      orders,
      payments,
    });
  }

  private mapPayment(row: PaymentTransactionRow): PaymentRecord {
    return {
      id: String(row.id),
      tenant_id: String(row.tenant_id),
      retailer_id: String(row.retailer_id),
      retailer_name: row.retailer_name ?? "Unknown retailer",
      order_id: String(row.order_id),
      amount: Number(row.amount_paise ?? 0),
      payment_mode: row.payment_mode,
      reference_note: row.reference_note ?? null,
      paid_at: toIsoString(row.paid_at),
      created_at: toIsoString(row.created_at),
    };
  }
}

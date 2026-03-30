import { describe, expect, it } from "vitest";

import {
  calculatePaymentsSummary,
  calculateRetailerCreditSummary,
  type PaymentCalculationInput,
  type PaymentSummaryOrderInput,
} from "../apps/backend/src/modules/payments/module.repository";

describe("payments repository financial calculations", () => {
  it("derives retailer credit summary math from orders and payments", () => {
    const orders: PaymentSummaryOrderInput[] = [
      { id: "order-1", total_amount: 10000, payment_mode: "cod" },
      { id: "order-2", total_amount: 5000, payment_mode: "credit" },
    ];
    const payments: PaymentCalculationInput[] = [
      {
        order_id: "order-1",
        amount_paise: 4000,
        payment_mode: "cod",
        paid_at: "2026-03-29T09:00:00.000Z",
      },
      {
        order_id: "order-2",
        amount_paise: 1000,
        payment_mode: "advance",
        paid_at: "2026-03-30T08:00:00.000Z",
      },
    ];

    const result = calculateRetailerCreditSummary({
      creditLimitPaise: 50000,
      orders,
      payments,
    });

    expect(result).toEqual({
      credit_limit: 50000,
      current_outstanding: 10000,
      advance_balance: 0,
      overdue_amount: 10000,
      last_payment_date: "2026-03-30T08:00:00.000Z",
    });
  });

  it("derives cod pending from cod orders even when no cod payment row exists", () => {
    const orders: PaymentSummaryOrderInput[] = [
      { id: "order-1", total_amount: 10000, payment_mode: "cod" },
      { id: "order-2", total_amount: 7000, payment_mode: "cod" },
      { id: "order-3", total_amount: 6000, payment_mode: "credit" },
    ];
    const payments: PaymentCalculationInput[] = [
      {
        order_id: "order-1",
        amount_paise: 2000,
        payment_mode: "advance",
        paid_at: "2026-03-30T09:00:00.000Z",
      },
      {
        order_id: "order-3",
        amount_paise: 3000,
        payment_mode: "credit",
        paid_at: "2026-03-30T10:00:00.000Z",
      },
    ];

    const result = calculatePaymentsSummary({
      orders,
      payments,
      now: new Date("2026-03-30T12:00:00.000Z"),
    });

    expect(result).toEqual({
      total_outstanding: 18000,
      advance_collected_today: 2000,
      cod_pending: 15000,
    });
  });

  it("keeps advance balance and outstanding internally consistent when advance exceeds order value", () => {
    const orders: PaymentSummaryOrderInput[] = [
      { id: "order-1", total_amount: 5000, payment_mode: "cod" },
    ];
    const payments: PaymentCalculationInput[] = [
      {
        order_id: "order-1",
        amount_paise: 7000,
        payment_mode: "advance",
        paid_at: "2026-03-30T10:00:00.000Z",
      },
    ];

    const result = calculateRetailerCreditSummary({
      creditLimitPaise: 25000,
      orders,
      payments,
    });

    expect(result).toEqual({
      credit_limit: 25000,
      current_outstanding: 0,
      advance_balance: 2000,
      overdue_amount: 0,
      last_payment_date: "2026-03-30T10:00:00.000Z",
    });
  });
});

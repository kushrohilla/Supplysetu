import { describe, expect, it } from "vitest";

import {
  calculatePaymentsSummary,
  calculateRetailerCreditSummary,
  type PaymentCalculationInput,
  type PaymentSummaryOrderInput,
} from "../apps/backend/src/modules/payments/module.repository";

describe("payments repository financial calculations", () => {
  // ── calculateRetailerCreditSummary ──────────────────────────────────

  describe("calculateRetailerCreditSummary", () => {
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

    it("returns zero outstanding and zero advance when orders and payments are empty", () => {
      const result = calculateRetailerCreditSummary({
        creditLimitPaise: 10000,
        orders: [],
        payments: [],
      });

      expect(result).toEqual({
        credit_limit: 10000,
        current_outstanding: 0,
        advance_balance: 0,
        overdue_amount: 0,
        last_payment_date: null,
      });
    });

    it("overdue_amount equals current_outstanding (simplified rule)", () => {
      const orders: PaymentSummaryOrderInput[] = [
        { id: "o1", total_amount: 20000, payment_mode: "credit" },
      ];
      const payments: PaymentCalculationInput[] = [
        { order_id: "o1", amount_paise: 5000, payment_mode: "credit", paid_at: "2026-03-30T10:00:00.000Z" },
      ];

      const result = calculateRetailerCreditSummary({
        creditLimitPaise: 50000,
        orders,
        payments,
      });

      // overdue must always equal outstanding in current simplified implementation
      expect(result.overdue_amount).toBe(result.current_outstanding);
      expect(result.current_outstanding).toBe(15000);
    });

    it("handles null total_amount gracefully by treating as zero", () => {
      const orders: PaymentSummaryOrderInput[] = [
        { id: "o1", total_amount: null, payment_mode: "cod" },
      ];
      const payments: PaymentCalculationInput[] = [
        { order_id: "o1", amount_paise: 500, payment_mode: "cod", paid_at: "2026-03-30T10:00:00.000Z" },
      ];

      const result = calculateRetailerCreditSummary({
        creditLimitPaise: 0,
        orders,
        payments,
      });

      // order worth 0, payment of 500 → advance_balance = 500
      expect(result.current_outstanding).toBe(0);
      expect(result.advance_balance).toBe(500);
    });

    it("handles string amount_paise (from DB numeric columns)", () => {
      const orders: PaymentSummaryOrderInput[] = [
        // Backend stores total_amount as decimal "125.50" (rupees) — decimalRupeesToPaise would convert at repo level.
        // At the calculation layer we deal in paise already, so pass integer.
        { id: "o1", total_amount: 12550, payment_mode: "cod" },
      ];
      const payments: PaymentCalculationInput[] = [
        { order_id: "o1", amount_paise: "5000", payment_mode: "cod", paid_at: "2026-03-30T10:00:00.000Z" },
      ];

      const result = calculateRetailerCreditSummary({
        creditLimitPaise: 25000,
        orders,
        payments,
      });

      expect(result.current_outstanding).toBe(7550);
    });

    it("clamps both outstanding and advance to zero when exactly balanced", () => {
      const orders: PaymentSummaryOrderInput[] = [
        { id: "o1", total_amount: 10000, payment_mode: "cod" },
      ];
      const payments: PaymentCalculationInput[] = [
        { order_id: "o1", amount_paise: 10000, payment_mode: "cod", paid_at: "2026-03-30T10:00:00.000Z" },
      ];

      const result = calculateRetailerCreditSummary({
        creditLimitPaise: 50000,
        orders,
        payments,
      });

      expect(result.current_outstanding).toBe(0);
      expect(result.advance_balance).toBe(0);
      expect(result.overdue_amount).toBe(0);
    });
  });

  // ── calculatePaymentsSummary ────────────────────────────────────────

  describe("calculatePaymentsSummary", () => {
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

    it("returns zero summary for empty orders and payments", () => {
      const result = calculatePaymentsSummary({
        orders: [],
        payments: [],
        now: new Date("2026-03-30T12:00:00.000Z"),
      });

      expect(result).toEqual({
        total_outstanding: 0,
        advance_collected_today: 0,
        cod_pending: 0,
      });
    });

    it("excludes advance payments from yesterday in today's advance_collected_today", () => {
      // The summary uses setHours() which is local-timezone-sensitive.
      // Build "today" and "yesterday" relative to a concrete local Date to be timezone-safe.
      const now = new Date(2026, 2, 30, 14, 0, 0); // March 30, 2026, 14:00 local time
      const todayPayment = new Date(2026, 2, 30, 9, 0, 0); // Same day, 09:00 local
      const yesterdayPayment = new Date(2026, 2, 29, 23, 0, 0); // Previous day, 23:00 local

      const orders: PaymentSummaryOrderInput[] = [
        { id: "o1", total_amount: 10000, payment_mode: "cod" },
      ];
      const payments: PaymentCalculationInput[] = [
        // Yesterday's advance
        { order_id: "o1", amount_paise: 3000, payment_mode: "advance", paid_at: yesterdayPayment.toISOString() },
        // Today's advance
        { order_id: "o1", amount_paise: 2000, payment_mode: "advance", paid_at: todayPayment.toISOString() },
      ];

      const result = calculatePaymentsSummary({
        orders,
        payments,
        now,
      });

      expect(result.advance_collected_today).toBe(2000);
      expect(result.total_outstanding).toBe(5000);
    });

    it("does not count non-advance payments in advance_collected_today", () => {
      const orders: PaymentSummaryOrderInput[] = [
        { id: "o1", total_amount: 10000, payment_mode: "cod" },
      ];
      const payments: PaymentCalculationInput[] = [
        { order_id: "o1", amount_paise: 5000, payment_mode: "cod", paid_at: "2026-03-30T10:00:00.000Z" },
      ];

      const result = calculatePaymentsSummary({
        orders,
        payments,
        now: new Date("2026-03-30T12:00:00.000Z"),
      });

      expect(result.advance_collected_today).toBe(0);
      expect(result.cod_pending).toBe(5000);
    });

    it("per-order outstanding is clamped to zero even if overpaid", () => {
      const orders: PaymentSummaryOrderInput[] = [
        { id: "o1", total_amount: 5000, payment_mode: "cod" },
        { id: "o2", total_amount: 5000, payment_mode: "cod" },
      ];
      const payments: PaymentCalculationInput[] = [
        // Overpay order-1 by 3000
        { order_id: "o1", amount_paise: 8000, payment_mode: "cod", paid_at: "2026-03-30T12:00:00.000Z" },
      ];

      const result = calculatePaymentsSummary({
        orders,
        payments,
        now: new Date("2026-03-30T12:00:00.000Z"),
      });

      // order-1 outstanding = max(5000-8000, 0) = 0
      // order-2 outstanding = 5000
      expect(result.total_outstanding).toBe(5000);
      expect(result.cod_pending).toBe(5000);
    });

    it("credits-mode orders do not appear in cod_pending", () => {
      const orders: PaymentSummaryOrderInput[] = [
        { id: "o1", total_amount: 10000, payment_mode: "credit" },
      ];

      const result = calculatePaymentsSummary({
        orders,
        payments: [],
        now: new Date("2026-03-30T12:00:00.000Z"),
      });

      expect(result.total_outstanding).toBe(10000);
      expect(result.cod_pending).toBe(0);
    });
  });
});

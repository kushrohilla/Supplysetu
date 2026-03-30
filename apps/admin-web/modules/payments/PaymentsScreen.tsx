"use client";

import { useEffect, useMemo, useState, startTransition, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { ApiError } from "@/services/api.service";
import { clearAuthSession, getApiErrorMessage } from "@/services/auth.service";
import { orderService } from "@/services/order.service";
import { paymentService } from "@/services/payment.service";
import { retailerService } from "@/services/retailer.service";
import type { Order } from "@/types/order";
import type { PaymentMode, PaymentsListResponse, RetailerCreditSummary } from "@/types/payment";
import type { Retailer } from "@/types/retailer";

const PAGE_SIZE = 10;

const defaultPaymentsResponse: PaymentsListResponse = {
  items: [],
  pagination: {
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    total_pages: 0,
  },
  summary: {
    total_outstanding: 0,
    advance_collected_today: 0,
    cod_pending: 0,
  },
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrencyFromPaise = (value: number) => currencyFormatter.format(value / 100);

const formatCurrencyFromRupees = (value: number) => currencyFormatter.format(value);

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "No payments yet";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const rupeesToPaise = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100);
};

export function PaymentsScreen() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentsListResponse>(defaultPaymentsResponse);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditSaving, setCreditSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedRetailerId, setSelectedRetailerId] = useState("");
  const [page, setPage] = useState(1);
  const [creditRetailerId, setCreditRetailerId] = useState("");
  const [creditSummary, setCreditSummary] = useState<RetailerCreditSummary | null>(null);
  const [creditError, setCreditError] = useState<string | null>(null);
  const [creditLimitInput, setCreditLimitInput] = useState("");
  const [creditLimitError, setCreditLimitError] = useState<string | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [modalRetailerId, setModalRetailerId] = useState("");
  const [modalOrderId, setModalOrderId] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalPaymentMode, setModalPaymentMode] = useState<PaymentMode>("advance");
  const [modalNote, setModalNote] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    const loadStaticData = async () => {
      try {
        const [retailerData, orderData] = await Promise.all([
          retailerService.fetchRetailers(),
          orderService.fetchOrders(),
        ]);
        setRetailers(retailerData);
        setOrders(orderData);
      } catch (loadError) {
        if (loadError instanceof ApiError && loadError.status === 401) {
          clearAuthSession();
          router.push("/login");
          return;
        }

        setError(getApiErrorMessage(loadError, "Unable to load retailers and orders."));
      }
    };

    void loadStaticData();
  }, [router]);

  useEffect(() => {
    const loadPayments = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await paymentService.fetchPayments({
          retailerId: selectedRetailerId || undefined,
          page,
          limit: PAGE_SIZE,
        });
        setPayments(response);
      } catch (loadError) {
        if (loadError instanceof ApiError && loadError.status === 401) {
          clearAuthSession();
          router.push("/login");
          return;
        }

        setError(getApiErrorMessage(loadError, "Unable to load payments."));
      } finally {
        setLoading(false);
      }
    };

    void loadPayments();
  }, [page, router, selectedRetailerId]);

  useEffect(() => {
    if (!creditRetailerId) {
      setCreditSummary(null);
      setCreditError(null);
      setCreditLimitInput("");
      return;
    }

    const loadCreditSummary = async () => {
      setCreditLoading(true);
      setCreditError(null);

      try {
        const summary = await paymentService.fetchRetailerCreditSummary(creditRetailerId);
        setCreditSummary(summary);
        setCreditLimitInput((summary.credit_limit / 100).toFixed(2));
      } catch (loadError) {
        if (loadError instanceof ApiError && loadError.status === 401) {
          clearAuthSession();
          router.push("/login");
          return;
        }

        setCreditSummary(null);
        setCreditError(getApiErrorMessage(loadError, "Unable to load retailer credit summary."));
      } finally {
        setCreditLoading(false);
      }
    };

    void loadCreditSummary();
  }, [creditRetailerId, router]);

  const filteredOrders = useMemo(
    () => orders.filter((order) => order.retailer_id === modalRetailerId),
    [modalRetailerId, orders],
  );

  const selectedCreditRetailerName = useMemo(
    () => retailers.find((retailer) => retailer.id === creditRetailerId)?.name ?? "Selected retailer",
    [creditRetailerId, retailers],
  );

  const resetModalState = () => {
    setModalRetailerId("");
    setModalOrderId("");
    setModalAmount("");
    setModalPaymentMode("advance");
    setModalNote("");
    setModalError(null);
  };

  const refreshPayments = async (retailerId = selectedRetailerId, nextPage = page) => {
    const response = await paymentService.fetchPayments({
      retailerId: retailerId || undefined,
      page: nextPage,
      limit: PAGE_SIZE,
    });
    setPayments(response);
  };

  const handleAuthError = (value: unknown) => {
    if (value instanceof ApiError && value.status === 401) {
      clearAuthSession();
      router.push("/login");
      return true;
    }

    return false;
  };

  const openRecordModal = () => {
    setIsRecordModalOpen(true);
    setModalRetailerId(selectedRetailerId || creditRetailerId || retailers[0]?.id || "");
    setModalOrderId("");
    setModalAmount("");
    setModalPaymentMode("advance");
    setModalNote("");
    setModalError(null);
  };

  const closeRecordModal = () => {
    setIsRecordModalOpen(false);
    resetModalState();
  };

  const onRetailerFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextRetailerId = event.target.value;
    startTransition(() => {
      setSelectedRetailerId(nextRetailerId);
      setPage(1);
    });
  };

  const onSaveCreditLimit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!creditRetailerId) {
      return;
    }

    const nextCreditLimit = rupeesToPaise(creditLimitInput);
    if (nextCreditLimit === null) {
      setCreditLimitError("Credit limit must be a non-negative rupee amount.");
      return;
    }

    setCreditSaving(true);
    setCreditLimitError(null);
    setFeedback(null);

    try {
      const result = await paymentService.updateRetailerCreditLimit(creditRetailerId, nextCreditLimit);
      setCreditSummary((current) =>
        current
          ? {
              ...current,
              credit_limit: result.credit_limit,
            }
          : current,
      );
      setCreditLimitInput((result.credit_limit / 100).toFixed(2));
      setFeedback(`Updated credit limit for ${selectedCreditRetailerName}.`);
    } catch (saveError) {
      if (handleAuthError(saveError)) {
        return;
      }

      setCreditLimitError(getApiErrorMessage(saveError, "Unable to update credit limit."));
    } finally {
      setCreditSaving(false);
    }
  };

  const onRecordPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!modalRetailerId) {
      setModalError("Select a retailer first.");
      return;
    }

    if (!modalOrderId) {
      setModalError("Select an order to record the payment against.");
      return;
    }

    const amountPaise = rupeesToPaise(modalAmount);
    if (amountPaise === null || amountPaise <= 0) {
      setModalError("Enter a valid rupee amount greater than zero.");
      return;
    }

    setRecording(true);
    setModalError(null);
    setFeedback(null);

    try {
      await paymentService.recordPayment(
        {
          order_id: modalOrderId,
          amount: amountPaise,
          payment_mode: modalPaymentMode,
          reference_note: modalNote.trim() || undefined,
        },
        crypto.randomUUID(),
      );

      await refreshPayments();
      if (creditRetailerId) {
        const summary = await paymentService.fetchRetailerCreditSummary(creditRetailerId);
        setCreditSummary(summary);
        setCreditLimitInput((summary.credit_limit / 100).toFixed(2));
      }
      setFeedback("Payment recorded successfully.");
      closeRecordModal();
    } catch (recordError) {
      if (handleAuthError(recordError)) {
        return;
      }

      setModalError(getApiErrorMessage(recordError, "Unable to record payment."));
    } finally {
      setRecording(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
            <p className="text-sm text-slate-600">
              Record collections, monitor receivables, and review retailer credit with tenant-safe payment history.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium">Retailer filter</span>
              <select
                value={selectedRetailerId}
                onChange={onRetailerFilterChange}
                className="min-w-[220px] rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                <option value="">All retailers</option>
                {retailers.map((retailer) => (
                  <option key={retailer.id} value={retailer.id}>
                    {retailer.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={openRecordModal}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Record Payment
            </button>
          </div>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Outstanding</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatCurrencyFromPaise(payments.summary.total_outstanding)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Net unpaid balance after recorded payments.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Advance Collected Today</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatCurrencyFromPaise(payments.summary.advance_collected_today)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Advance-mode collections recorded today.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">COD Pending</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatCurrencyFromPaise(payments.summary.cod_pending)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Outstanding balance on COD orders only.</p>
        </div>
      </section>

      {feedback ? <div className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Payment history</h2>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading payments...</div>
          ) : payments.items.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center p-6">
              <EmptyState
                icon="P"
                title={selectedRetailerId ? "No payments for this retailer" : "No payments recorded yet"}
                helper={
                  selectedRetailerId
                    ? "Try a different retailer filter or record the first payment for this retailer."
                    : "Record the first payment to begin tracking collections and outstanding balances."
                }
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="border-b border-slate-200 px-4 py-3 font-medium">Retailer Name</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-medium">Order ID</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-medium">Amount</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-medium">Mode</th>
                      <th className="border-b border-slate-200 px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.items.map((payment) => (
                      <tr key={payment.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-3 font-medium text-slate-900">{payment.retailer_name}</td>
                        <td className="px-4 py-3 text-slate-700">{payment.order_id}</td>
                        <td className="px-4 py-3 text-slate-700">{formatCurrencyFromPaise(payment.amount)}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
                            {payment.payment_mode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div>{formatDateTime(payment.paid_at)}</div>
                          {payment.reference_note ? <div className="text-xs text-slate-500">{payment.reference_note}</div> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {payments.pagination.total_pages > 1 ? (
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
                  <p>
                    Page {payments.pagination.page} of {payments.pagination.total_pages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                      disabled={page <= 1}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((currentPage) => Math.min(payments.pagination.total_pages, currentPage + 1))}
                      disabled={page >= payments.pagination.total_pages}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Retailer credit view</h2>
              <p className="text-sm text-slate-600">
                Select a retailer to review credit limit, current exposure, advances, and last payment activity.
              </p>
            </div>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium">Retailer</span>
              <select
                value={creditRetailerId}
                onChange={(event) => setCreditRetailerId(event.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                <option value="">Select retailer</option>
                {retailers.map((retailer) => (
                  <option key={retailer.id} value={retailer.id}>
                    {retailer.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {creditLoading ? (
            <div className="mt-6 text-sm text-slate-500">Loading credit summary...</div>
          ) : creditError ? (
            <div className="mt-6 rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{creditError}</div>
          ) : !creditSummary ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
              Select a retailer to view credit information.
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Credit Limit</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrencyFromPaise(creditSummary.credit_limit)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Outstanding</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {formatCurrencyFromPaise(creditSummary.current_outstanding)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Advance Balance</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {formatCurrencyFromPaise(creditSummary.advance_balance)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Overdue</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {formatCurrencyFromPaise(creditSummary.overdue_amount)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Last Payment</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{formatDateTime(creditSummary.last_payment_date)}</p>
              </div>

              <form onSubmit={onSaveCreditLimit} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="flex flex-1 flex-col gap-2 text-sm text-slate-700">
                    <span className="font-medium">Update credit limit (INR)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={creditLimitInput}
                      onChange={(event) => setCreditLimitInput(event.target.value)}
                      className="rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-slate-400"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={creditSaving}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creditSaving ? "Saving..." : "Save limit"}
                  </button>
                </div>
                {creditLimitError ? <div className="mt-3 rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{creditLimitError}</div> : null}
              </form>
            </div>
          )}
        </section>
      </div>

      {isRecordModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <button
            type="button"
            aria-label="Close payment modal"
            onClick={closeRecordModal}
            className="absolute inset-0 cursor-default"
          />
          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">Record payment</h2>
              <p className="text-sm text-slate-600">Select a retailer, choose an order, and submit the collected amount.</p>
            </div>

            <form onSubmit={onRecordPayment} className="flex flex-col gap-4 p-6">
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span className="font-medium">Retailer</span>
                <select
                  value={modalRetailerId}
                  onChange={(event) => {
                    setModalRetailerId(event.target.value);
                    setModalOrderId("");
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-slate-400"
                >
                  <option value="">Select retailer</option>
                  {retailers.map((retailer) => (
                    <option key={retailer.id} value={retailer.id}>
                      {retailer.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span className="font-medium">Order</span>
                <select
                  value={modalOrderId}
                  onChange={(event) => setModalOrderId(event.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-slate-400"
                >
                  <option value="">Select order</option>
                  {filteredOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.order_number} · {formatCurrencyFromRupees(Number(order.total_amount))}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-700">
                  <span className="font-medium">Amount (INR)</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={modalAmount}
                    onChange={(event) => setModalAmount(event.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm text-slate-700">
                  <span className="font-medium">Payment mode</span>
                  <select
                    value={modalPaymentMode}
                    onChange={(event) => setModalPaymentMode(event.target.value as PaymentMode)}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-slate-400"
                  >
                    <option value="advance">Advance</option>
                    <option value="cod">COD</option>
                    <option value="credit">Credit</option>
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span className="font-medium">Reference note</span>
                <textarea
                  value={modalNote}
                  onChange={(event) => setModalNote(event.target.value)}
                  rows={3}
                  placeholder="Optional note such as UPI reference, cheque note, or collection context"
                  className="rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-slate-400"
                />
              </label>

              {modalError ? <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{modalError}</div> : null}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeRecordModal}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recording}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {recording ? "Recording..." : "Submit payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

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

export type PaymentsSummary = {
  total_outstanding: number;
  advance_collected_today: number;
  cod_pending: number;
};

export type PaymentsListResponse = {
  items: PaymentRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  summary: PaymentsSummary;
};

export type RecordPaymentPayload = {
  order_id: string;
  amount: number;
  payment_mode: PaymentMode;
  reference_note?: string;
  paid_at?: string;
};

export type RetailerCreditSummary = {
  credit_limit: number;
  current_outstanding: number;
  advance_balance: number;
  overdue_amount: number;
  last_payment_date: string | null;
};

export type RetailerCreditLimitResponse = {
  retailer_id: string;
  credit_limit: number;
};

export const ORDER_STATUS = {
  DRAFT: "DRAFT",
  PLACED: "PLACED",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [ORDER_STATUS.DRAFT]: [ORDER_STATUS.PLACED, ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PLACED]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CANCELLED]: [],
};

export const canTransitionOrderStatus = (from: OrderStatus, to: OrderStatus) =>
  ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;

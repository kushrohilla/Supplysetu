export const ORDER_STATUS = {
  PENDING_APPROVAL: "pending_approval",
  CONFIRMED: "confirmed",
  DISPATCHED: "dispatched",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  CLOSED: "closed",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [ORDER_STATUS.PENDING_APPROVAL]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.DISPATCHED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.DISPATCHED]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.CLOSED],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.CLOSED]: [],
};

export const canTransitionOrderStatus = (from: OrderStatus, to: OrderStatus) =>
  ORDER_STATUS_TRANSITIONS[from].includes(to);

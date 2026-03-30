export const ORDER_STATUS = {
  DRAFT: "DRAFT",
  PLACED: "PLACED",
  CONFIRMED: "CONFIRMED",
  INVOICED: "INVOICED",
  PACKED: "PACKED",
  DISPATCHED: "DISPATCHED",
  DELIVERED: "DELIVERED",
  CLOSED: "CLOSED",
  CANCELLED: "CANCELLED",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
export type OrderStatusActorRole = "admin" | "retailer";

export const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS) as [OrderStatus, ...OrderStatus[]];

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [ORDER_STATUS.DRAFT]: [ORDER_STATUS.PLACED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PLACED]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.INVOICED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.INVOICED]: [ORDER_STATUS.PACKED],
  [ORDER_STATUS.PACKED]: [ORDER_STATUS.DISPATCHED],
  [ORDER_STATUS.DISPATCHED]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.CLOSED],
  [ORDER_STATUS.CLOSED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

const RETAILER_ALLOWED_TRANSITIONS = new Set<string>([
  `${ORDER_STATUS.DRAFT}:${ORDER_STATUS.PLACED}`,
  `${ORDER_STATUS.DRAFT}:${ORDER_STATUS.CANCELLED}`,
  `${ORDER_STATUS.PLACED}:${ORDER_STATUS.CANCELLED}`,
]);

const transitionKey = (from: OrderStatus, to: OrderStatus) => `${from}:${to}`;

export const canTransitionOrderStatus = (from: OrderStatus, to: OrderStatus) =>
  ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;

export const canActorTransitionOrderStatus = (
  actorRole: OrderStatusActorRole,
  from: OrderStatus,
  to: OrderStatus,
) => {
  if (actorRole === "admin") {
    return true;
  }

  return RETAILER_ALLOWED_TRANSITIONS.has(transitionKey(from, to));
};

export const getAllowedNextOrderStatuses = (status: OrderStatus) => ORDER_STATUS_TRANSITIONS[status] ?? [];

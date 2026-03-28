import { AppError } from "../../../shared/errors/app-error";

import { OrderActorRole } from "./order-actor-role";
import { OrderStatus } from "./order-status";

export type OrderTransition = {
  from: OrderStatus;
  to: OrderStatus;
};

const transitionMap: Record<OrderStatus, readonly OrderStatus[]> = {
  DRAFT: ["PLACED", "CONFIRMED", "CANCELLED"],
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CANCELLED"],
  CANCELLED: []
};

const transitionActorMap: Record<string, readonly OrderActorRole[]> = {
  "DRAFT:PLACED": ["admin", "system"],
  "DRAFT:CONFIRMED": ["admin", "system"],
  "DRAFT:CANCELLED": ["admin", "system"],
  "PLACED:CONFIRMED": ["admin", "system"],
  "PLACED:CANCELLED": ["admin", "system"],
  "CONFIRMED:CANCELLED": ["admin", "system"]
};

const transitionKey = (transition: OrderTransition) => `${transition.from}:${transition.to}`;

export const getAllowedNextStatuses = (status: OrderStatus): readonly OrderStatus[] => {
  return transitionMap[status];
};

export const canTransitionOrderStatus = (from: OrderStatus, to: OrderStatus): boolean => {
  return transitionMap[from]?.includes(to) ?? false;
};

export const getAllowedActorRolesForTransition = (
  from: OrderStatus,
  to: OrderStatus
): readonly OrderActorRole[] => {
  return transitionActorMap[`${from}:${to}`] ?? [];
};

export const canActorPerformOrderTransition = (
  actorRole: OrderActorRole,
  from: OrderStatus,
  to: OrderStatus
): boolean => {
  return getAllowedActorRolesForTransition(from, to).includes(actorRole);
};

export const assertValidOrderTransition = (from: OrderStatus, to: OrderStatus): void => {
  if (canTransitionOrderStatus(from, to)) {
    return;
  }

  throw new AppError(
    `Cannot transition order from ${from} to ${to}`,
    409,
    "INVALID_ORDER_TRANSITION",
    {
      currentStatus: from,
      requestedStatus: to,
      allowedNextStatuses: getAllowedNextStatuses(from)
    }
  );
};

export const assertAuthorizedOrderTransition = (
  actorRole: OrderActorRole,
  from: OrderStatus,
  to: OrderStatus
): void => {
  if (canActorPerformOrderTransition(actorRole, from, to)) {
    return;
  }

  throw new AppError(
    `Role ${actorRole} cannot transition order from ${from} to ${to}`,
    403,
    "ORDER_TRANSITION_ROLE_FORBIDDEN",
    {
      actorRole,
      currentStatus: from,
      requestedStatus: to,
      allowedActorRoles: getAllowedActorRolesForTransition(from, to)
    }
  );
};

export const assertNoDuplicateTerminalUpdate = (currentStatus: OrderStatus, nextStatus: OrderStatus): void => {
  if (currentStatus !== nextStatus) {
    return;
  }

  const duplicateErrorMap: Partial<Record<OrderStatus, string>> = {
    PLACED: "DUPLICATE_ORDER_PLACEMENT",
    CONFIRMED: "DUPLICATE_ORDER_CONFIRMATION",
    CANCELLED: "DUPLICATE_ORDER_CANCELLATION"
  };

  throw new AppError(
    `Order is already in ${currentStatus} state`,
    409,
    duplicateErrorMap[currentStatus] ?? "DUPLICATE_ORDER_STATUS_UPDATE",
    {
      currentStatus,
      requestedStatus: nextStatus
    }
  );
};

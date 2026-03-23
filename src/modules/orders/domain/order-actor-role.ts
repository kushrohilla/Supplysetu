export const orderActorRoles = ["admin", "system", "sync_worker"] as const;

export type OrderActorRole = (typeof orderActorRoles)[number];

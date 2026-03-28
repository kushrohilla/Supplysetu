import type { FastifyInstance } from "fastify";

import { buildAuthMiddleware } from "../../shared/middleware/authenticate";
import { InviteController } from "./invite.controller";

export const registerInviteRoutes = async (fastify: FastifyInstance) => {
  const controller = new InviteController();
  const authenticate = buildAuthMiddleware();
  const inviteTokenParamsSchema = {
    type: "object",
    required: ["token"],
    properties: {
      token: { type: "string", minLength: 1 },
    },
    additionalProperties: false,
  } as const;
  const acceptInviteBodySchema = {
    type: "object",
    required: ["token"],
    properties: {
      token: { type: "string", minLength: 1 },
    },
    additionalProperties: false,
  } as const;

  fastify.post("/invites", { preHandler: authenticate }, controller.createInvite.bind(controller));
  fastify.get<{ Params: { token: string } }>(
    "/invites/:token",
    { schema: { params: inviteTokenParamsSchema } },
    controller.validateInvite.bind(controller),
  );
  fastify.post(
    "/invites/accept",
    { preHandler: authenticate, schema: { body: acceptInviteBodySchema } },
    controller.acceptInvite.bind(controller),
  );
};

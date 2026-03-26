import type { FastifyReply, FastifyRequest } from "fastify";

export class PricingController {
  async health(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ success: true, data: { status: "ok" } });
  }
}

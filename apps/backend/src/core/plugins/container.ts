import fp from "fastify-plugin";

import type { AppContainer } from "../config/container";

declare module "fastify" {
  interface FastifyInstance {
    container: AppContainer;
  }
}

export const containerPlugin = fp<{ container: AppContainer }>(async (fastify, options) => {
  fastify.decorate("container", options.container);
});

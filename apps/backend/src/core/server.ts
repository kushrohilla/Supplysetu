import { buildApp } from "./app";
import { env, logger } from "./config";

const start = async () => {
  const app = await buildApp();

  try {
    await app.listen({
      host: "0.0.0.0",
      port: env.PORT,
    });
    logger.info({ port: env.PORT }, "Backend server started");
  } catch (error) {
    logger.error({ err: error }, "Failed to start backend server");
    process.exit(1);
  }
};

void start();

/**
 * Bootstrap Layer Index
 *
 * Re-exports the complete bootstrap API for application initialization.
 * Provides a clean entry point for application startup logic.
 */

export { bootstrapApp } from "./app.bootstrap";
export { startServer, gracefulShutdown, registerShutdownHandlers } from "./server.bootstrap";
export type { BootstrapServerOptions } from "./server.bootstrap";

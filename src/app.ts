/**
 * App Factory (Backward Compatibility)
 *
 * DEPRECATED: This file is maintained for backward compatibility only.
 * New code should use src/bootstrap/app.bootstrap.ts directly.
 *
 * This module now delegates to the bootstrap layer which provides
 * better separation of concerns and clearer intent.
 */

export { bootstrapApp as createApp } from "./bootstrap/app.bootstrap";

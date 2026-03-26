import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextCommand = process.argv[2];
const nextArgs = process.argv.slice(3);

if (!nextCommand) {
  console.error("Missing Next.js command");
  process.exit(1);
}

const env = { ...process.env };

// Railway services sometimes inject a non-standard NODE_ENV like "preview".
// Force production semantics for build/start so Next.js behaves consistently.
if (nextCommand === "build" || nextCommand === "start") {
  env.NODE_ENV = "production";
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const executable = path.resolve(
  __dirname,
  "..",
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next",
);

const child = spawn(executable, [nextCommand, ...nextArgs], {
  env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

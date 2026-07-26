import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;

export default defineConfig({
  base: runtimeEnv?.VERCEL ? "/" : "/german/",
  plugins: [react()],
  build: {
    sourcemap: false,
  },
  test: {
    environment: "node",
    coverage: {
      reporter: ["text", "html"],
    },
  },
});

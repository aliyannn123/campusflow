import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// UI tests need JSX transformation, but do not compile the production styles.
export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", setupFiles: ["./tests/setup.js"], maxWorkers: 1, testTimeout: 30000, hookTimeout: 30000 },
});

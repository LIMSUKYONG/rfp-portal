import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    env: { ...require("dotenv").config({ path: ".env.local" }).parsed },
    testTimeout: 30000,
    sequence: { sequential: true },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});

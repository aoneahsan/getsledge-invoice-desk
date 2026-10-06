// Developer: Ahsan Mahmood | https://aoneahsan.com
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: ".",
  test: { include: ["tests/**/*.test.{ts,tsx}"], environment: "node" },
});

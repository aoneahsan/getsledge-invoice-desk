// Developer: Ahsan Mahmood | https://aoneahsan.com
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export const apiProxyContext = "^/api(?:[/?]|$)";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: "src/client",
  build: { outDir: "../../dist/client", emptyOutDir: true },
  server: {
    port: 5173,
    proxy: { [apiProxyContext]: "http://127.0.0.1:3001" },
  },
});

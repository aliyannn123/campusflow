import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { "/api": process.env.VITE_PROXY_TARGET || "http://localhost:5000", "/socket.io": { target: process.env.VITE_PROXY_TARGET || "http://localhost:5000", ws: true } } },
  test: { environment: "jsdom", setupFiles: ["./tests/setup.js"] },
});

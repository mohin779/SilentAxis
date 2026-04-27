import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ["buffer", "process", "util", "events", "stream", "assert"],
      globals: {
        Buffer: true,
        global: true,
        process: true
      },
      protocolImports: true
    })
  ],
  resolve: {
    alias: {
      util: "util/",
      events: "events/",
      buffer: "buffer/",
      process: "process/browser"
    }
  },
  define: {
    global: "globalThis",
    "process.env": {}
  },
  optimizeDeps: {
    include: ["buffer", "process", "util", "events"]
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  }
});


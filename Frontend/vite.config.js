import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cesium from "vite-plugin-cesium";

export default defineConfig({
  plugins: [react(), cesium()],

  server: {
    host: true,

    allowedHosts: [
      "skewer-devourer-product.ngrok-free.dev",
    ],

    proxy: {
      "/route": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
});
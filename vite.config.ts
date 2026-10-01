import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "assets/hydroscale.js",
        assetFileNames: (asset) => asset.name?.endsWith(".css")
          ? "assets/hydroscale.css"
          : "assets/[name]-[hash][extname]",
      },
    },
  },
});

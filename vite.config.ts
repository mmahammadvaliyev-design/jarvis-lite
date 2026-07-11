import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" so the built app works from any static host subpath (GitHub Pages etc.)
export default defineConfig({
  base: "./",
  plugins: [react()],
});

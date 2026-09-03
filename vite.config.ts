import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Tauri serves the frontend from a fixed port and reads the bundle from dist/.
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: { target: "chrome105", sourcemap: false },
});

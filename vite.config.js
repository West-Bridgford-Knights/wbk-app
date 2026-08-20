import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the built assets resolve correctly whether the app is
// served at https://<user>.github.io/<repo>/ or any other sub-path.
export default defineConfig({
  plugins: [react()],
  base: "./",
});

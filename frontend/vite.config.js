// Settings for Vite, the tool that runs our React app while we develop it.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Let Vite understand React code (JSX)
  plugins: [react()],

  server: {
    // The React app opens on http://localhost:5173
    port: 5173,

    // Any request that starts with "/api" is sent to our Python backend.
    // So in React we can just write "/api/login" instead of the full address.
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});

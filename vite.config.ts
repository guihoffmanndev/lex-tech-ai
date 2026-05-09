import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import posthog from "@posthog/rollup-plugin";
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const shouldUploadSourcemaps =
    mode === "production" && !!env.POSTHOG_API_KEY && !!env.POSTHOG_PROJECT_ID;
  return {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    ...(shouldUploadSourcemaps
      ? [
          posthog({
            personalApiKey: env.POSTHOG_API_KEY,
            projectId: env.POSTHOG_PROJECT_ID,
            host: env.POSTHOG_HOST || "https://us.i.posthog.com",
            sourcemaps: {
              enabled: true,
              deleteAfterUpload: true,
            },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "radix-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-popover",
            "@radix-ui/react-tooltip",
          ],
          charts: ["recharts"],
          editor: [
            "@tiptap/react",
            "@tiptap/starter-kit",
            "@tiptap/extension-text-align",
          ],
          docs: [
            "docx",
            "docxtemplater",
            "docx-preview",
            "mammoth",
            "pizzip",
            "jszip",
          ],
          export: ["xlsx", "html2pdf.js", "file-saver"],
          dnd: [
            "@dnd-kit/core",
            "@dnd-kit/sortable",
            "@dnd-kit/utilities",
            "@hello-pangea/dnd",
          ],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
  };
});

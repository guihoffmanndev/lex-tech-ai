import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PostHogProvider, PostHogErrorBoundary } from "@posthog/react";
import App from "./App.tsx";
import "./index.css";
import "@vectoricons/atlas-icons/style.css";

const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: "2026-01-30",
} as const;

function ErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-2xl font-semibold">Algo deu errado</h1>
        <p className="text-muted-foreground">
          Um erro inesperado ocorreu. Nossa equipe foi notificada. Tente recarregar a página.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
        >
          Recarregar
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <PostHogProvider
    apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN}
    options={posthogOptions}
  >
    <PostHogErrorBoundary fallback={<ErrorFallback />}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PostHogErrorBoundary>
  </PostHogProvider>
);

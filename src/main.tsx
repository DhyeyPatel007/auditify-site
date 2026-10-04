import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { TermsPage } from "./pages/Terms";
import { PrivacyPage } from "./pages/Privacy";
import "./index.css";

const path = window.location.pathname.replace(/\/+$/, "") || "/";

function Route() {
  if (path === "/terms") return <TermsPage />;
  if (path === "/privacy") return <PrivacyPage />;
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Route />
  </StrictMode>
);

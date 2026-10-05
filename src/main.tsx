import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { TermsPage } from "./pages/Terms";
import { PrivacyPage } from "./pages/Privacy";
import { MethodologyPage } from "./pages/Methodology";
import { TeardownsPage } from "./pages/Teardowns";
import { TeardownPostPage } from "./pages/TeardownPost";
import "./index.css";

const path = window.location.pathname.replace(/\/+$/, "") || "/";

function Route() {
  if (path === "/terms") return <TermsPage />;
  if (path === "/privacy") return <PrivacyPage />;
  if (path === "/methodology") return <MethodologyPage />;
  if (path === "/teardowns") return <TeardownsPage />;
  if (path.startsWith("/teardowns/")) {
    const slug = decodeURIComponent(path.slice("/teardowns/".length)).split("/")[0];
    return <TeardownPostPage slug={slug} />;
  }
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Route />
  </StrictMode>
);

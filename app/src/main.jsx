import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import RyznComplete from "./RyznApp.jsx";
import RyznTeams from "./teams/RyznTeams.jsx";
import RyznAdmin from "./admin/RyznAdmin.jsx";

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error("Ryzn crashed:", err, info); }
  render() {
    /* The fallback used to be text only, so the sole way out of any render
       error was for the user to work out that they had to refresh the browser
       themselves. Screens carry their own boundary now (SectionBoundary), so
       reaching this one means the shell itself failed — offer the reload. */
    if (this.state.err) return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', system-ui, sans-serif", background: "#E9E8E4", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 340 }}>
          <div style={{ fontFamily: F.sans, fontSize: 34, fontWeight: 700, color: "#5B4FCF" }}>RYZN</div>
          <div style={{ marginTop: 10, color: "#5F5E5A", lineHeight: 1.5 }}>Something broke on our side. Your account and your work are safe.</div>
          <button onClick={() => window.location.reload()} style={{
            marginTop: 18, fontFamily: "inherit", fontWeight: 600, fontSize: 15, border: "none",
            borderRadius: 12, padding: "13px 22px", background: "#5B4FCF", color: "#FFFFFF", cursor: "pointer",
          }}>Reload Ryzn</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

/* Routes — one origin, one bundle, three surfaces:
     /app/          consumer app
     /app/#/teams   Ryzn for Teams (org console + seats)
     /app/#/admin   Ryzn founder console */
function Router() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  if (hash.startsWith("#/admin")) return <RyznAdmin />;
  return hash.startsWith("#/teams") ? <RyznTeams /> : <RyznComplete />;
}

/* The worker lives at the origin root so its scope is "/", and it only exists
   in the assembled build — the dev server serves /app/ alone, so registering
   there would 404 on every reload. */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  });
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  </React.StrictMode>
);

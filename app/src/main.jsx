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
    if (this.state.err) return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', system-ui, sans-serif", background: "#E9E8E4" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 34, fontWeight: 700, color: "#5B4FCF" }}>RYZN</div>
          <div style={{ marginTop: 10, color: "#5F5E5A" }}>Something broke. Refresh to rise again.</div>
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

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  </React.StrictMode>
);

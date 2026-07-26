import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import RyznComplete from "./RyznApp.jsx";

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

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RyznComplete />
    </ErrorBoundary>
  </React.StrictMode>
);

import { useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile site key, public by design (like a Stripe publishable
 * key), safe to inline into the bundle. Unset means the widget simply never
 * renders and signUp proceeds without a captcha header, so local dev and any
 * deploy that hasn't configured Turnstile yet still work unchanged.
 */
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

let scriptPromise = null;
const loadScript = () => {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const el = document.createElement("script");
    el.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    el.async = true;
    el.defer = true;
    el.onload = () => resolve(window.turnstile);
    el.onerror = () => reject(new Error("Turnstile script failed to load."));
    document.head.appendChild(el);
  });
  return scriptPromise;
};

/**
 * Renders a Turnstile widget into `ref` and returns the current pass/fail
 * token. Server side (lib/auth.js) requires this on /sign-up/email whenever
 * TURNSTILE_SECRET_KEY is set, the two must be configured together.
 */
export function useTurnstile() {
  const ref = useRef(null);
  const widgetId = useRef(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !ref.current) return;
    let cancelled = false;

    loadScript().then((turnstile) => {
      if (cancelled || !ref.current) return;
      widgetId.current = turnstile.render(ref.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "auto",
        callback: (t) => setToken(t),
        "expired-callback": () => setToken(null),
        "error-callback": () => setToken(null),
      });
    });

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
    };
  }, []);

  return { ref, token, required: Boolean(TURNSTILE_SITE_KEY) };
}

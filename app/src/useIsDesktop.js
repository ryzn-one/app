import { useState, useEffect } from "react";
import { BREAKPOINT } from "./theme.js";

export const useIsDesktop = () => {
  const query = `(min-width: ${BREAKPOINT}px)`;
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setIsDesktop(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
};

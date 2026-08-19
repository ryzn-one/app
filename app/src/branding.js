/* Ryzn brand kit, always served from origin root (/branding/...), not under /app/ */

export const brandAsset = (path) => `/branding/ryzn-brand-kit/${String(path).replace(/^\//, "")}`;

export const Brand = {
  kit: "/branding/ryzn-brand-kit",
  logo: {
    horizontal: {
      purple: brandAsset("logo/svg/ryzn-lockup-horizontal-purple.svg"),
      white: brandAsset("logo/svg/ryzn-lockup-horizontal-white.svg"),
      ink: brandAsset("logo/svg/ryzn-lockup-horizontal-ink.svg"),
      duotone: brandAsset("logo/svg/ryzn-lockup-horizontal-duotone.svg"),
    },
    stacked: {
      purple: brandAsset("logo/svg/ryzn-lockup-stacked-purple.svg"),
      white: brandAsset("logo/svg/ryzn-lockup-stacked-white.svg"),
      duotone: brandAsset("logo/svg/ryzn-lockup-stacked-duotone.svg"),
    },
    mark: {
      purple: brandAsset("logo/svg/ryzn-mark-purple.svg"),
      white: brandAsset("logo/svg/ryzn-mark-white.svg"),
      ink: brandAsset("logo/svg/ryzn-mark-ink.svg"),
      duotone: brandAsset("logo/svg/ryzn-mark-duotone.svg"),
    },
    wordmark: {
      purple: brandAsset("logo/svg/ryzn-wordmark-purple.svg"),
      white: brandAsset("logo/svg/ryzn-wordmark-white.svg"),
      ink: brandAsset("logo/svg/ryzn-wordmark-ink.svg"),
      taglineInk: brandAsset("logo/svg/ryzn-wordmark-tagline-ink.svg"),
    },
  },
  icon: {
    app: brandAsset("icon/svg/ryzn-app-icon.svg"),
    appLight: brandAsset("icon/svg/ryzn-app-icon-light.svg"),
    appInk: brandAsset("icon/svg/ryzn-app-icon-ink.svg"),
    maskable: brandAsset("icon/svg/ryzn-app-icon-maskable.svg"),
    atom: brandAsset("icon/svg/ryzn-favicon-atom.svg"),
    png: {
      180: brandAsset("icon/png/ryzn-app-icon-180.png"),
      192: brandAsset("icon/png/ryzn-app-icon-192.png"),
      512: brandAsset("icon/png/ryzn-app-icon-512.png"),
    },
  },
  motif: {
    diamonds: brandAsset("motifs/ryzn-diamond-pattern.svg"),
    tiers: brandAsset("motifs/ryzn-tier-marks.svg"),
  },
  social: {
    og: brandAsset("social/ryzn-og-image.png"),
    banner: brandAsset("social/ryzn-banner.png"),
    avatar: brandAsset("social/ryzn-avatar-400.png"),
  },
};

/** Resolve a logo SVG from the kit. Prefer outlined files over live type. */
export function logoSrc(variant = "horizontal", color = "purple") {
  const map = Brand.logo[variant];
  if (!map) return Brand.logo.horizontal.purple;
  return map[color] || map.purple || Object.values(map)[0];
}

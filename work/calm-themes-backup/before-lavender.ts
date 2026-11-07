export type ColorThemeId =
  "wameed" | "ocean" | "cloud" | "sapphire" | "emerald" | "turquoise";

type SurfaceColors = {
  bg: string;
  surface: string;
  text: string;
  border: string;
  muted: string;
  soft: string;
  inset: string;
  link: string;
  finance: string;
};
export type ColorPreset = {
  id: ColorThemeId;
  name: string;
  description: string;
  nav: string;
  primary: string;
  highlight: string;
  onDark: string;
  glow: string;
  light: SurfaceColors;
  dark: SurfaceColors;
};

export const colorThemes: readonly ColorPreset[] = [
  {
    id: "wameed",
    name: "Wameed",
    description: "Original green & gold",
    nav: "#103B35",
    primary: "#103B35",
    highlight: "#DDB13B",
    onDark: "#F6E8B7",
    glow: "#2F6951",
    light: {
      bg: "#F6F8F7",
      surface: "#FFFFFF",
      text: "#25313A",
      border: "#E3E9E6",
      muted: "#63766D",
      soft: "#EDF5F0",
      inset: "#F3F6F4",
      link: "#13614C",
      finance: "#103B35",
    },
    dark: {
      bg: "#111C1A",
      surface: "#1B2926",
      text: "#E7EFEC",
      border: "#30413D",
      muted: "#ADBCB6",
      soft: "#263A31",
      inset: "#202F2B",
      link: "#8CD7B5",
      finance: "#234A3E",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Deep blue & sky blue",
    nav: "#102D4E",
    primary: "#1B5795",
    highlight: "#8CD8EB",
    onDark: "#D9F4FF",
    glow: "#246486",
    light: {
      bg: "#F3F7FC",
      surface: "#FFFFFF",
      text: "#23334A",
      border: "#DCE6F1",
      muted: "#5F728A",
      soft: "#EAF3FC",
      inset: "#F0F5FB",
      link: "#1C5E9F",
      finance: "#164471",
    },
    dark: {
      bg: "#101B2A",
      surface: "#192A3E",
      text: "#E8F1FB",
      border: "#30455C",
      muted: "#A8BCD2",
      soft: "#213F59",
      inset: "#203449",
      link: "#91D2F5",
      finance: "#234D70",
    },
  },
  {
    id: "cloud",
    name: "Cloud",
    description: "Soft blue-grey",
    nav: "#313D4B",
    primary: "#53657B",
    highlight: "#BCC8D5",
    onDark: "#E7EDF3",
    glow: "#596877",
    light: {
      bg: "#EEF1F4",
      surface: "#F7F9FA",
      text: "#34404B",
      border: "#D5DCE3",
      muted: "#66727F",
      soft: "#E5EBEF",
      inset: "#E9EEF2",
      link: "#4C6074",
      finance: "#465666",
    },
    dark: {
      bg: "#20272F",
      surface: "#2A333D",
      text: "#E3E9EE",
      border: "#414D58",
      muted: "#B2BEC9",
      soft: "#354451",
      inset: "#323E4A",
      link: "#C0CDD8",
      finance: "#3B4B5B",
    },
  },
  {
    id: "sapphire",
    name: "Sapphire",
    description: "Royal blue & sapphire",
    nav: "#152F70",
    primary: "#2454B5",
    highlight: "#A6C3FA",
    onDark: "#E0EBFF",
    glow: "#285BB3",
    light: {
      bg: "#F3F6FC",
      surface: "#FFFFFF",
      text: "#27344E",
      border: "#DCE4F3",
      muted: "#66738B",
      soft: "#E7EEFD",
      inset: "#EDF2FC",
      link: "#244FAD",
      finance: "#20478F",
    },
    dark: {
      bg: "#111B30",
      surface: "#1A2C4C",
      text: "#E5EEFC",
      border: "#304A76",
      muted: "#ADBFDF",
      soft: "#233D69",
      inset: "#203659",
      link: "#A9C8FF",
      finance: "#204787",
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    description: "Deep emerald & mint",
    nav: "#064B3B",
    primary: "#087454",
    highlight: "#78DDB6",
    onDark: "#D5FFED",
    glow: "#178B65",
    light: {
      bg: "#F2F8F5",
      surface: "#FFFFFF",
      text: "#23392F",
      border: "#D8E8DF",
      muted: "#5D7567",
      soft: "#E2F4EA",
      inset: "#EAF5EF",
      link: "#086B4C",
      finance: "#086448",
    },
    dark: {
      bg: "#101F19",
      surface: "#193329",
      text: "#E2F4E9",
      border: "#2E5544",
      muted: "#A4C8B5",
      soft: "#1B4B38",
      inset: "#20412F",
      link: "#7FE4B4",
      finance: "#086346",
    },
  },
  {
    id: "turquoise",
    name: "Turquoise",
    description: "Deep turquoise & aqua",
    nav: "#084C55",
    primary: "#087582",
    highlight: "#86DCD6",
    onDark: "#D9FCF8",
    glow: "#19848C",
    light: {
      bg: "#F1F8F8",
      surface: "#FFFFFF",
      text: "#263C40",
      border: "#D6E8E8",
      muted: "#5C7377",
      soft: "#DFF3F1",
      inset: "#E8F5F4",
      link: "#086B76",
      finance: "#0C6570",
    },
    dark: {
      bg: "#101F24",
      surface: "#18343B",
      text: "#E1F3F4",
      border: "#2D5660",
      muted: "#A2C7CD",
      soft: "#1D4850",
      inset: "#20424A",
      link: "#86DFDE",
      finance: "#0C626D",
    },
  },
];
export function resolveColorTheme(value: string | null): ColorPreset {
  // Keep saved selections compatible when a palette is replaced.
  const legacy: Record<string, ColorThemeId> = {
    copper: "sapphire",
    cherry: "turquoise",
    pearl: "sapphire",
    breeze: "emerald",
    rose: "turquoise",
    sand: "sapphire",
    olive: "emerald",
    charcoal: "cloud",
    ruby: "turquoise",
  };
  const id = value ? legacy[value] || value : "wameed";
  return colorThemes.find((preset) => preset.id === id) || colorThemes[0];
}
export function presetVariables(
  preset: ColorPreset,
  mode: "light" | "dark",
): Record<string, string> {
  const surface = preset[mode];
  return {
    "--brand-nav": preset.nav,
    "--brand-primary": preset.primary,
    "--brand-highlight": preset.highlight,
    "--brand-on-dark": preset.onDark,
    "--brand-glow": preset.glow,
    "--brand-muted": surface.muted,
    "--brand-soft": surface.soft,
    "--brand-inset": surface.inset,
    "--brand-link": surface.link,
    "--brand-finance": surface.finance,
    "--wameed-bg": surface.bg,
    "--wameed-surface": surface.surface,
    "--wameed-text": surface.text,
    "--wameed-border": surface.border,
  };
}

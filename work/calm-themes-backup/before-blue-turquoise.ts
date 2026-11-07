export type ColorThemeId =
  "wameed" | "ocean" | "cloud" | "copper" | "emerald" | "cherry";

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
    id: "copper",
    name: "Copper",
    description: "Rich copper & amber",
    nav: "#62321B",
    primary: "#A64B1D",
    highlight: "#E9B15E",
    onDark: "#FFE5BA",
    glow: "#A45F2E",
    light: {
      bg: "#FAF6F1",
      surface: "#FFFFFF",
      text: "#3E3028",
      border: "#EADFD3",
      muted: "#7D6B5C",
      soft: "#F8EBDD",
      inset: "#F5EEE5",
      link: "#9C491F",
      finance: "#85401D",
    },
    dark: {
      bg: "#211912",
      surface: "#33271E",
      text: "#F4EADD",
      border: "#57402D",
      muted: "#CDB59D",
      soft: "#4C311D",
      inset: "#3D2C1F",
      link: "#F0BA75",
      finance: "#783D1E",
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
    id: "cherry",
    name: "Cherry",
    description: "Deep cherry & warm rose",
    nav: "#641E32",
    primary: "#A32949",
    highlight: "#F0ABAF",
    onDark: "#FFE2E3",
    glow: "#A13B50",
    light: {
      bg: "#FCF4F5",
      surface: "#FFFFFF",
      text: "#422B33",
      border: "#EEDCE1",
      muted: "#826873",
      soft: "#FBE6EB",
      inset: "#F9EDF0",
      link: "#A02746",
      finance: "#8A2440",
    },
    dark: {
      bg: "#24151C",
      surface: "#391E2A",
      text: "#F7E7ED",
      border: "#613145",
      muted: "#D5ADB9",
      soft: "#572539",
      inset: "#462334",
      link: "#F5A7BD",
      finance: "#85203C",
    },
  },
];
export function resolveColorTheme(value: string | null): ColorPreset {
  // Move saved selections from the retired palettes to their calmer replacements.
  const legacy: Record<string, ColorThemeId> = {
    pearl: "copper",
    breeze: "emerald",
    rose: "cherry",
    sand: "copper",
    olive: "emerald",
    charcoal: "cloud",
    ruby: "cherry",
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

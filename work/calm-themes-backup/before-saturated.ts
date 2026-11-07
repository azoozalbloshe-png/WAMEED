export type ColorThemeId =
  "wameed" | "ocean" | "cloud" | "pearl" | "breeze" | "rose";

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
    id: "pearl",
    name: "Pearl",
    description: "Soft ivory & warm grey",
    nav: "#48443F",
    primary: "#6E6356",
    highlight: "#D0C8BD",
    onDark: "#EEE9E1",
    glow: "#7D766C",
    light: {
      bg: "#F2F0EC",
      surface: "#F9F7F3",
      text: "#413D37",
      border: "#DED9D0",
      muted: "#71675D",
      soft: "#EAE6DE",
      inset: "#EEEAE4",
      link: "#6E5D4D",
      finance: "#655E53",
    },
    dark: {
      bg: "#292723",
      surface: "#36332E",
      text: "#E8E4DC",
      border: "#514B42",
      muted: "#C5BEB1",
      soft: "#454039",
      inset: "#3E3A33",
      link: "#D1C6B5",
      finance: "#50493E",
    },
  },
  {
    id: "breeze",
    name: "Breeze",
    description: "Muted sage green",
    nav: "#354841",
    primary: "#526E61",
    highlight: "#BDCEC3",
    onDark: "#E4EDE7",
    glow: "#647C70",
    light: {
      bg: "#EEF3EF",
      surface: "#F6F9F6",
      text: "#33463D",
      border: "#D4DFD8",
      muted: "#627369",
      soft: "#E2ECE5",
      inset: "#E8F0EA",
      link: "#486253",
      finance: "#486153",
    },
    dark: {
      bg: "#202B26",
      surface: "#2B3831",
      text: "#E0EAE3",
      border: "#43564A",
      muted: "#AEC4B5",
      soft: "#364B3E",
      inset: "#33443A",
      link: "#C2D6C8",
      finance: "#3C5646",
    },
  },
  {
    id: "rose",
    name: "Rose",
    description: "Muted dusty rose",
    nav: "#4C3B42",
    primary: "#80616E",
    highlight: "#D9C2CA",
    onDark: "#F0E4E9",
    glow: "#80666F",
    light: {
      bg: "#F5F0F2",
      surface: "#FBF7F9",
      text: "#49373F",
      border: "#E3D6DC",
      muted: "#7E6873",
      soft: "#EFE5E9",
      inset: "#F1E9ED",
      link: "#795361",
      finance: "#71505E",
    },
    dark: {
      bg: "#2C2328",
      surface: "#3A2F35",
      text: "#ECE1E6",
      border: "#59454F",
      muted: "#CFB6C2",
      soft: "#4A3942",
      inset: "#43353C",
      link: "#DCC3CF",
      finance: "#5D424F",
    },
  },
];
export function resolveColorTheme(value: string | null): ColorPreset {
  // Move saved selections from the retired palettes to their calmer replacements.
  const legacy: Record<string, ColorThemeId> = {
    sand: "pearl",
    olive: "breeze",
    charcoal: "cloud",
    ruby: "rose",
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

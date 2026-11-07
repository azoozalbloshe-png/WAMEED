export type ColorThemeId =
  "wameed" | "ocean" | "sand" | "olive" | "charcoal" | "ruby";

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
    id: "sand",
    name: "Sand",
    description: "Warm beige & copper",
    nav: "#3E2D25",
    primary: "#795138",
    highlight: "#E6BE86",
    onDark: "#FFF0D9",
    glow: "#896247",
    light: {
      bg: "#FAF7F2",
      surface: "#FFFEFB",
      text: "#3D332D",
      border: "#E9E0D6",
      muted: "#7B6D61",
      soft: "#F5EBDF",
      inset: "#F5F0E9",
      link: "#805334",
      finance: "#634733",
    },
    dark: {
      bg: "#211C18",
      surface: "#302821",
      text: "#F4EDE3",
      border: "#4D4135",
      muted: "#C5B5A5",
      soft: "#49382A",
      inset: "#3A3027",
      link: "#E4BF90",
      finance: "#59412C",
    },
  },
  {
    id: "olive",
    name: "Olive",
    description: "Olive green & ivory",
    nav: "#2E3723",
    primary: "#536238",
    highlight: "#D1D9A0",
    onDark: "#F5F5DC",
    glow: "#69734A",
    light: {
      bg: "#F7F8F1",
      surface: "#FFFFFB",
      text: "#30382A",
      border: "#E1E5D5",
      muted: "#6C755D",
      soft: "#EFF2E2",
      inset: "#F2F4E9",
      link: "#536632",
      finance: "#465333",
    },
    dark: {
      bg: "#1B2016",
      surface: "#282F20",
      text: "#EDF1E3",
      border: "#414B33",
      muted: "#B9C2A9",
      soft: "#3A442B",
      inset: "#303925",
      link: "#CDDCA5",
      finance: "#45532F",
    },
  },
  {
    id: "charcoal",
    name: "Charcoal",
    description: "Charcoal grey & silver",
    nav: "#222A35",
    primary: "#3E4A5B",
    highlight: "#CDD5E0",
    onDark: "#F1F5FA",
    glow: "#526171",
    light: {
      bg: "#F5F6F8",
      surface: "#FFFFFF",
      text: "#29313E",
      border: "#E0E4E9",
      muted: "#677383",
      soft: "#EBEFF4",
      inset: "#F0F2F5",
      link: "#40516A",
      finance: "#344153",
    },
    dark: {
      bg: "#171B21",
      surface: "#232A34",
      text: "#EDF0F5",
      border: "#3B4553",
      muted: "#B3BDCD",
      soft: "#35404E",
      inset: "#2C3542",
      link: "#CDD8E9",
      finance: "#3A485B",
    },
  },
  {
    id: "ruby",
    name: "Ruby",
    description: "Burgundy & soft rose",
    nav: "#4C2033",
    primary: "#9B3454",
    highlight: "#F0B8C8",
    onDark: "#FFE7EF",
    glow: "#8A405A",
    light: {
      bg: "#FCF5F7",
      surface: "#FFFFFF",
      text: "#402D36",
      border: "#EEDDE4",
      muted: "#806574",
      soft: "#FAEAF0",
      inset: "#F8EEF2",
      link: "#9B3454",
      finance: "#703049",
    },
    dark: {
      bg: "#23171E",
      surface: "#34212B",
      text: "#FAEAF1",
      border: "#583747",
      muted: "#D1AEBD",
      soft: "#512E40",
      inset: "#402834",
      link: "#F0B8C8",
      finance: "#642E47",
    },
  },
];
export function resolveColorTheme(value: string | null): ColorPreset {
  return colorThemes.find((preset) => preset.id === value) || colorThemes[0];
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

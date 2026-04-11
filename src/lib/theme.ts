export const THEME_MODES = ["system", "dark", "light"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const THEME_ACCENTS = [
	{ value: "teal", label: "Teal", swatch: "oklch(0.72 0.15 185)" },
	{ value: "blue", label: "Blue", swatch: "oklch(0.67 0.17 250)" },
	{ value: "violet", label: "Violet", swatch: "oklch(0.66 0.2 305)" },
	{ value: "rose", label: "Rose", swatch: "oklch(0.68 0.2 18)" },
	{ value: "amber", label: "Amber", swatch: "oklch(0.78 0.16 85)" },
	{ value: "emerald", label: "Emerald", swatch: "oklch(0.73 0.16 155)" },
	{ value: "cyan", label: "Cyan", swatch: "oklch(0.75 0.13 210)" },
	{ value: "slate", label: "Slate", swatch: "oklch(0.68 0.03 255)" },
] as const;
export type ThemeAccent = (typeof THEME_ACCENTS)[number]["value"];

export const THEME_ACCENT_VALUES = THEME_ACCENTS.map((accent) => accent.value) as [
	ThemeAccent,
	...ThemeAccent[],
];

export const DEFAULT_THEME_MODE: ThemeMode = "system";
export const DEFAULT_THEME_ACCENT: ThemeAccent = "teal";
export const THEME_MODE_COOKIE = "cvt_theme_mode";
export const THEME_ACCENT_COOKIE = "cvt_theme_accent";

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
	return THEME_MODES.includes(value as ThemeMode);
}

export function isThemeAccent(value: string | null | undefined): value is ThemeAccent {
	return THEME_ACCENT_VALUES.includes(value as ThemeAccent);
}

export function normalizeThemeMode(value: string | null | undefined): ThemeMode {
	return isThemeMode(value) ? value : DEFAULT_THEME_MODE;
}

export function normalizeThemeAccent(value: string | null | undefined): ThemeAccent {
	return isThemeAccent(value) ? value : DEFAULT_THEME_ACCENT;
}

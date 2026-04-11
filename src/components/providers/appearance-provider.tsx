"use client";

import { ThemeProvider, useTheme } from "next-themes";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import {
	DEFAULT_THEME_ACCENT,
	DEFAULT_THEME_MODE,
	isThemeAccent,
	isThemeMode,
	type ThemeAccent,
	type ThemeMode,
} from "@/lib/theme";

type AppearanceContextValue = {
	mode: ThemeMode;
	accent: ThemeAccent;
	setMode: (mode: ThemeMode) => void;
	setAccent: (accent: ThemeAccent) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function AppearanceStateProvider({
	children,
	initialThemeMode,
	initialThemeAccent,
}: {
	children: ReactNode;
	initialThemeMode: ThemeMode;
	initialThemeAccent: ThemeAccent;
}) {
	const { theme, setTheme } = useTheme();
	const [accent, setAccentState] = useState<ThemeAccent>(initialThemeAccent);
	const setMode = useCallback(
		(nextMode: ThemeMode) => {
			setTheme(nextMode);
		},
		[setTheme],
	);
	const setAccent = useCallback((nextAccent: ThemeAccent) => {
		if (!isThemeAccent(nextAccent)) {
			return;
		}
		setAccentState(nextAccent);
	}, []);

	useEffect(() => {
		setTheme(initialThemeMode);
	}, [initialThemeMode, setTheme]);

	useEffect(() => {
		setAccentState(initialThemeAccent);
	}, [initialThemeAccent]);

	useEffect(() => {
		document.documentElement.setAttribute("data-accent", accent);
	}, [accent]);

	const mode = isThemeMode(theme) ? theme : DEFAULT_THEME_MODE;

	const value = useMemo<AppearanceContextValue>(
		() => ({
			mode,
			accent,
			setMode,
			setAccent,
		}),
		[accent, mode, setMode, setAccent],
	);

	return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function AppearanceProvider({
	children,
	initialThemeMode = DEFAULT_THEME_MODE,
	initialThemeAccent = DEFAULT_THEME_ACCENT,
}: {
	children: ReactNode;
	initialThemeMode?: ThemeMode;
	initialThemeAccent?: ThemeAccent;
}) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme={initialThemeMode}
			enableSystem
			disableTransitionOnChange
		>
			<AppearanceStateProvider
				initialThemeMode={initialThemeMode}
				initialThemeAccent={initialThemeAccent}
			>
				{children}
			</AppearanceStateProvider>
		</ThemeProvider>
	);
}

export function useAppearance() {
	const context = useContext(AppearanceContext);
	if (!context) {
		throw new Error("useAppearance must be used within AppearanceProvider");
	}
	return context;
}

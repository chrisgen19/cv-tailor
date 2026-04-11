import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { AppearanceProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import {
	normalizeThemeAccent,
	normalizeThemeMode,
	THEME_ACCENT_COOKIE,
	THEME_MODE_COOKIE,
	type ThemeAccent,
	type ThemeMode,
} from "@/lib/theme";
import "./globals.css";

const inter = Inter({
	variable: "--font-sans",
	subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "CV Tailor — AI-Powered CV Optimization",
	description:
		"Upload your master CV, paste a job description, and get a tailored CV optimized for each job posting.",
};

async function getInitialAppearance(): Promise<{
	mode: ThemeMode;
	accent: ThemeAccent;
}> {
	const cookieStore = await cookies();
	return {
		mode: normalizeThemeMode(cookieStore.get(THEME_MODE_COOKIE)?.value),
		accent: normalizeThemeAccent(cookieStore.get(THEME_ACCENT_COOKIE)?.value),
	};
}

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const initialAppearance = await getInitialAppearance();
	const htmlClassName =
		initialAppearance.mode === "system" ? undefined : initialAppearance.mode;

	return (
		<html
			lang="en"
			className={htmlClassName}
			data-accent={initialAppearance.accent}
			suppressHydrationWarning
		>
			<body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
				<AppearanceProvider
					initialThemeMode={initialAppearance.mode}
					initialThemeAccent={initialAppearance.accent}
				>
					{children}
					<Toaster />
				</AppearanceProvider>
			</body>
		</html>
	);
}

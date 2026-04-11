import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { Inter, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import { cache } from "react";
import { AppearanceProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	DEFAULT_THEME_ACCENT,
	DEFAULT_THEME_MODE,
	isThemeAccent,
	isThemeMode,
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

const getInitialAppearance = cache(async (): Promise<{
	mode: ThemeMode;
	accent: ThemeAccent;
}> => {
	try {
		const session = await auth.api.getSession({ headers: await headers() });
		if (!session) {
			return {
				mode: DEFAULT_THEME_MODE,
				accent: DEFAULT_THEME_ACCENT,
			};
		}

		const user = await getCachedUserAppearance(session.user.id);

		return {
			mode: isThemeMode(user?.themeMode) ? user.themeMode : DEFAULT_THEME_MODE,
			accent: isThemeAccent(user?.themeAccent) ? user.themeAccent : DEFAULT_THEME_ACCENT,
		};
	} catch {
		return {
			mode: DEFAULT_THEME_MODE,
			accent: DEFAULT_THEME_ACCENT,
		};
	}
});

const getCachedUserAppearance = unstable_cache(
	async (userId: string) =>
		prisma.user.findUnique({
			where: { id: userId },
			select: { themeMode: true, themeAccent: true },
		}),
	["user-appearance"],
	{ revalidate: 60 },
);

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

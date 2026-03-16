import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
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

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
				{children}
				<Toaster />
			</body>
		</html>
	);
}

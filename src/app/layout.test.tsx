import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({
	cookiesMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
	cookies: cookiesMock,
}));

vi.mock("next/font/google", () => ({
	Inter: () => ({ variable: "--font-sans" }),
	JetBrains_Mono: () => ({ variable: "--font-geist-mono" }),
}));

vi.mock("@/components/providers/theme-provider", () => ({
	AppearanceProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/ui/sonner", () => ({
	Toaster: () => null,
}));

import RootLayout from "@/app/layout";

describe("RootLayout appearance initialization", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("falls back to system + default accent for invalid cookies", async () => {
		cookiesMock.mockResolvedValue({
			get: (name: string) => {
				if (name === "cvt_theme_mode") {
					return { value: "invalid" };
				}
				if (name === "cvt_theme_accent") {
					return { value: "invalid" };
				}
				return undefined;
			},
		});

		const tree = await RootLayout({ children: <div>Child</div> });

		expect(tree.props.className).toBeUndefined();
		expect(tree.props["data-accent"]).toBe("teal");
	});

	it("uses cookie values for mode and accent", async () => {
		cookiesMock.mockResolvedValue({
			get: (name: string) => {
				if (name === "cvt_theme_mode") {
					return { value: "dark" };
				}
				if (name === "cvt_theme_accent") {
					return { value: "rose" };
				}
				return undefined;
			},
		});

		const tree = await RootLayout({ children: <div>Child</div> });

		expect(tree.props.className).toBe("dark");
		expect(tree.props["data-accent"]).toBe("rose");
	});
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_ACCENT_COOKIE, THEME_MODE_COOKIE } from "@/lib/theme";

const { getSessionMock, findUniqueMock, updateMock } = vi.hoisted(() => ({
	getSessionMock: vi.fn(),
	findUniqueMock: vi.fn(),
	updateMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
	headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/auth", () => ({
	auth: {
		api: {
			getSession: getSessionMock,
		},
	},
}));

vi.mock("@/lib/prisma", () => ({
	prisma: {
		user: {
			findUnique: findUniqueMock,
			update: updateMock,
		},
	},
}));

import { GET, PATCH } from "@/app/api/settings/profile/route";

describe("settings/profile route cookies", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("sets theme cookies on GET", async () => {
		getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
		findUniqueMock.mockResolvedValue({
			name: "Chris",
			email: "chris@example.com",
			themeMode: "dark",
			themeAccent: "rose",
		});

		const response = await GET();

		expect(response.status).toBe(200);
		expect(response.cookies.get(THEME_MODE_COOKIE)?.value).toBe("dark");
		expect(response.cookies.get(THEME_ACCENT_COOKIE)?.value).toBe("rose");
	});

	it("sets theme cookies on PATCH", async () => {
		getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
		updateMock.mockResolvedValue({
			name: "Chris",
			email: "chris@example.com",
			themeMode: "light",
			themeAccent: "cyan",
		});

		const request = new Request("http://localhost/api/settings/profile", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ themeMode: "light", themeAccent: "cyan" }),
		});

		const response = await PATCH(request);

		expect(response.status).toBe(200);
		expect(updateMock).toHaveBeenCalledOnce();
		expect(response.cookies.get(THEME_MODE_COOKIE)?.value).toBe("light");
		expect(response.cookies.get(THEME_ACCENT_COOKIE)?.value).toBe("cyan");
	});
});

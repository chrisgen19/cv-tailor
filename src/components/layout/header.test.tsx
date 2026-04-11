import { act, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { setModeMock, toastErrorMock, state } = vi.hoisted(() => ({
	setModeMock: vi.fn(),
	toastErrorMock: vi.fn(),
	state: {
		onValueChangeRef: null as ((value: string) => void) | null,
	},
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
}));

vi.mock("@/lib/auth-client", () => ({
	useSession: () => ({
		data: {
			user: {
				name: "Chris Genesis",
				email: "chris@example.com",
				image: null,
			},
		},
	}),
	signOut: vi.fn(),
}));

vi.mock("@/components/providers/theme-provider", () => ({
	useAppearance: () => ({
		mode: "system",
		setMode: setModeMock,
	}),
}));

vi.mock("sonner", () => ({
	toast: {
		error: toastErrorMock,
	},
}));

vi.mock("@/components/ui/avatar", () => ({
	Avatar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	AvatarImage: () => null,
	AvatarFallback: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	DropdownMenuTrigger: ({ children }: { children: ReactNode }) => (
		<button type="button">{children}</button>
	),
	DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	DropdownMenuItem: ({ children }: { children: ReactNode }) => (
		<button type="button">{children}</button>
	),
	DropdownMenuLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	DropdownMenuSeparator: () => <hr />,
	DropdownMenuRadioGroup: ({
		onValueChange,
		children,
	}: {
		onValueChange: (value: string) => void;
		children: ReactNode;
	}) => {
		state.onValueChangeRef = onValueChange;
		return <div>{children}</div>;
	},
	DropdownMenuRadioItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { Header } from "@/components/layout/header";

describe("Header theme persistence", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		state.onValueChangeRef = null;
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
	});

	it("rolls back mode when save fails", async () => {
		render(<Header />);
		expect(state.onValueChangeRef).toBeTypeOf("function");

		await act(async () => {
			state.onValueChangeRef?.("dark");
		});

		expect(setModeMock).toHaveBeenNthCalledWith(1, "dark");
		expect(setModeMock).toHaveBeenNthCalledWith(2, "system");
		expect(toastErrorMock).toHaveBeenCalledWith("Theme change could not be saved");
	});
});

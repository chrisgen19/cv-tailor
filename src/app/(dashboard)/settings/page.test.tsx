import { act, fireEvent, render, screen } from "@testing-library/react";
import type {
	ButtonHTMLAttributes,
	InputHTMLAttributes,
	LabelHTMLAttributes,
	ReactNode,
} from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { setModeMock, setAccentMock, toastErrorMock } = vi.hoisted(() => ({
	setModeMock: vi.fn(),
	setAccentMock: vi.fn(),
	toastErrorMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
}));

vi.mock("@/components/providers/theme-provider", () => ({
	useAppearance: () => ({
		mode: "system",
		accent: "teal",
		setMode: setModeMock,
		setAccent: setAccentMock,
	}),
}));

vi.mock("@/lib/auth-client", () => ({
	useSession: () => ({
		data: {
			user: {
				name: "Chris Genesis",
				email: "chris@example.com",
			},
		},
	}),
	signOut: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		error: toastErrorMock,
		success: vi.fn(),
	},
}));

vi.mock("@/components/ui/button", () => ({
	Button: ({
		children,
		...props
	}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) => (
		<button {...props}>{children}</button>
	),
}));

vi.mock("@/components/ui/card", () => ({
	Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
	Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/input", () => ({
	Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
	Label: ({
		children,
		...props
	}: LabelHTMLAttributes<HTMLLabelElement> & { children: ReactNode }) => (
		<span {...props}>{children}</span>
	),
}));

import SettingsPage from "@/app/(dashboard)/settings/page";

type PendingRequest = {
	resolve: (response: Response) => void;
	reject: (reason?: unknown) => void;
	signal: AbortSignal | undefined;
};

describe("Settings appearance autosave", () => {
	let pendingRequests: PendingRequest[];

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		pendingRequests = [];

		vi.stubGlobal(
			"fetch",
			vi.fn((_url: string, init?: RequestInit) => {
				return new Promise<Response>((resolve, reject) => {
					const signal = init?.signal as AbortSignal | undefined;

					if (signal?.aborted) {
						reject(new DOMException("Aborted", "AbortError"));
						return;
					}

					signal?.addEventListener(
						"abort",
						() => {
							reject(new DOMException("Aborted", "AbortError"));
						},
						{ once: true },
					);

					pendingRequests.push({ resolve, reject, signal });
				});
			}),
		);
	});

	it("aborts stale appearance save request when a newer change is made", async () => {
		render(<SettingsPage />);

		fireEvent.click(screen.getByRole("button", { name: /dark/i }));
		await act(async () => {
			vi.advanceTimersByTime(350);
		});

		expect(pendingRequests).toHaveLength(1);

		fireEvent.click(screen.getByRole("button", { name: /light/i }));
		await act(async () => {
			vi.advanceTimersByTime(350);
		});

		expect(pendingRequests).toHaveLength(2);
		expect(pendingRequests[0].signal?.aborted).toBe(true);

		await act(async () => {
			pendingRequests[1].resolve(new Response(null, { status: 200 }));
		});

		expect(toastErrorMock).not.toHaveBeenCalled();
	});
});

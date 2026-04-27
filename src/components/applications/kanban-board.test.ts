import { describe, expect, it, vi } from "vitest";
import type { JobApplication } from "@/generated/prisma/client";
import { setApplicationStatus, submitStatusChange } from "./kanban-board";

function app(id: string, status: JobApplication["status"]): JobApplication {
	return {
		id,
		status,
		// Fields below are required by the type but unused for this test.
		userId: "u1",
		title: "t",
		company: "c",
		sourceUrl: null,
		rawDescription: "x",
		parsedRequirements: null,
		matchAnalysis: null,
		tailoredCV: null,
		tailoredCVEdited: null,
		tailoredCvJson: null,
		coverLetter: null,
		notes: null,
		appliedAt: null,
		salaryMin: null,
		salaryMax: null,
		salaryCurrency: null,
		workSetup: null,
		locationAddress: null,
		companyWebsite: null,
		contactName: null,
		contactEmail: null,
		contactPhone: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	} as JobApplication;
}

describe("setApplicationStatus", () => {
	it("updates only the matching card's status", () => {
		const apps = [app("a", "DRAFT"), app("b", "DRAFT"), app("c", "DRAFT")];
		const next = setApplicationStatus(apps, "b", "APPLIED");
		expect(next.find((a) => a.id === "a")?.status).toBe("DRAFT");
		expect(next.find((a) => a.id === "b")?.status).toBe("APPLIED");
		expect(next.find((a) => a.id === "c")?.status).toBe("DRAFT");
	});

	it("returns a new array instance (does not mutate)", () => {
		const apps = [app("a", "DRAFT")];
		const next = setApplicationStatus(apps, "a", "APPLIED");
		expect(next).not.toBe(apps);
		expect(apps[0].status).toBe("DRAFT");
	});

	it("preserves a successful concurrent move when reverting an unrelated failed move", () => {
		// Initial board: two DRAFT cards.
		const initial = [app("a", "DRAFT"), app("b", "DRAFT")];

		// First drag: b → APPLIED (will fail).
		const afterFirstOptimistic = setApplicationStatus(initial, "b", "APPLIED");

		// Second drag (concurrent, succeeds): a → INTERVIEW.
		const afterSecondOptimistic = setApplicationStatus(afterFirstOptimistic, "a", "INTERVIEW");

		// The first PATCH eventually fails; we revert by id, not by snapshot.
		const afterFirstRollback = setApplicationStatus(afterSecondOptimistic, "b", "DRAFT");

		// The successful second move (a → INTERVIEW) must survive the rollback.
		expect(afterFirstRollback.find((a) => a.id === "a")?.status).toBe("INTERVIEW");
		expect(afterFirstRollback.find((a) => a.id === "b")?.status).toBe("DRAFT");
	});

	it("is a no-op when id is not in the list", () => {
		const apps = [app("a", "DRAFT")];
		const next = setApplicationStatus(apps, "missing", "APPLIED");
		expect(next).toEqual(apps);
	});
});

describe("submitStatusChange", () => {
	function makeUpdater(initial: JobApplication[]) {
		let current = initial;
		const onUpdate = vi.fn(
			(updater: JobApplication[] | ((c: JobApplication[]) => JobApplication[])) => {
				current = typeof updater === "function" ? updater(current) : updater;
			},
		);
		return { onUpdate, get: () => current };
	}

	it("optimistically updates and resolves to the target status on a 200 response", async () => {
		const board = makeUpdater([app("a", "DRAFT"), app("b", "DRAFT")]);
		const fetchFn = vi.fn().mockResolvedValue({ ok: true });
		const onSuccess = vi.fn();
		const onFailure = vi.fn();

		await submitStatusChange({
			id: "a",
			fromStatus: "DRAFT",
			toStatus: "APPLIED",
			onUpdate: board.onUpdate,
			fetchFn: fetchFn as unknown as typeof fetch,
			onSuccess,
			onFailure,
		});

		expect(fetchFn).toHaveBeenCalledWith(
			"/api/applications/a",
			expect.objectContaining({
				method: "PATCH",
				body: JSON.stringify({ status: "APPLIED" }),
			}),
		);
		expect(board.get().find((x) => x.id === "a")?.status).toBe("APPLIED");
		expect(board.get().find((x) => x.id === "b")?.status).toBe("DRAFT");
		expect(onSuccess).toHaveBeenCalledWith("APPLIED");
		expect(onFailure).not.toHaveBeenCalled();
	});

	it("reverts only the moved card when the PATCH responds with !ok", async () => {
		const board = makeUpdater([app("a", "DRAFT"), app("b", "INTERVIEW")]);
		const fetchFn = vi.fn().mockResolvedValue({ ok: false });
		const onSuccess = vi.fn();
		const onFailure = vi.fn();

		await submitStatusChange({
			id: "a",
			fromStatus: "DRAFT",
			toStatus: "APPLIED",
			onUpdate: board.onUpdate,
			fetchFn: fetchFn as unknown as typeof fetch,
			onSuccess,
			onFailure,
		});

		// Two updates: optimistic forward, then revert.
		expect(board.onUpdate).toHaveBeenCalledTimes(2);
		expect(board.get().find((x) => x.id === "a")?.status).toBe("DRAFT");
		// Unrelated card is untouched.
		expect(board.get().find((x) => x.id === "b")?.status).toBe("INTERVIEW");
		expect(onFailure).toHaveBeenCalledTimes(1);
		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("reverts when fetch itself rejects (network error)", async () => {
		const board = makeUpdater([app("a", "DRAFT")]);
		const fetchFn = vi.fn().mockRejectedValue(new Error("network down"));
		const onFailure = vi.fn();

		await submitStatusChange({
			id: "a",
			fromStatus: "DRAFT",
			toStatus: "APPLIED",
			onUpdate: board.onUpdate,
			fetchFn: fetchFn as unknown as typeof fetch,
			onFailure,
		});

		expect(board.get().find((x) => x.id === "a")?.status).toBe("DRAFT");
		expect(onFailure).toHaveBeenCalledOnce();
	});

	it("does not clobber a concurrent successful move when reverting", async () => {
		// Two cards both DRAFT initially.
		const board = makeUpdater([app("a", "DRAFT"), app("b", "DRAFT")]);

		// Drag #1 (a → APPLIED) will fail; we capture its rollback after drag #2 commits.
		let resolveFirst: (v: { ok: boolean }) => void = () => {};
		const fetchFn = vi
			.fn()
			.mockImplementationOnce(
				() =>
					new Promise((r) => {
						resolveFirst = r;
					}),
			)
			.mockResolvedValueOnce({ ok: true });

		// Kick off drag #1 (will block on resolveFirst).
		const first = submitStatusChange({
			id: "a",
			fromStatus: "DRAFT",
			toStatus: "APPLIED",
			onUpdate: board.onUpdate,
			fetchFn: fetchFn as unknown as typeof fetch,
		});

		// Drag #2 (b → INTERVIEW) succeeds before drag #1 finishes.
		await submitStatusChange({
			id: "b",
			fromStatus: "DRAFT",
			toStatus: "INTERVIEW",
			onUpdate: board.onUpdate,
			fetchFn: fetchFn as unknown as typeof fetch,
		});

		expect(board.get().find((x) => x.id === "b")?.status).toBe("INTERVIEW");

		// Drag #1 finally fails — must revert "a" only, not blow away b's INTERVIEW.
		resolveFirst({ ok: false });
		await first;

		expect(board.get().find((x) => x.id === "a")?.status).toBe("DRAFT");
		expect(board.get().find((x) => x.id === "b")?.status).toBe("INTERVIEW");
	});
});

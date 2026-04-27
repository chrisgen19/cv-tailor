import { describe, expect, it } from "vitest";
import type { JobApplication } from "@/generated/prisma/client";
import { setApplicationStatus } from "./kanban-board";

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

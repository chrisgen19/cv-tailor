import { describe, expect, it } from "vitest";
import {
	APPLICATIONS_VIEWS,
	DEFAULT_APPLICATIONS_VIEW,
	isApplicationsView,
	normalizeApplicationsView,
} from "./applications-view";

describe("applications view helpers", () => {
	it("recognizes the canonical values", () => {
		for (const v of APPLICATIONS_VIEWS) {
			expect(isApplicationsView(v)).toBe(true);
		}
	});

	it("rejects unknown values", () => {
		expect(isApplicationsView("grid")).toBe(false);
		expect(isApplicationsView("")).toBe(false);
		expect(isApplicationsView(null)).toBe(false);
		expect(isApplicationsView(undefined)).toBe(false);
	});

	it("normalizes unknown/null values to the default", () => {
		expect(normalizeApplicationsView("grid")).toBe(DEFAULT_APPLICATIONS_VIEW);
		expect(normalizeApplicationsView(null)).toBe(DEFAULT_APPLICATIONS_VIEW);
		expect(normalizeApplicationsView(undefined)).toBe(DEFAULT_APPLICATIONS_VIEW);
	});

	it("preserves canonical values during normalization", () => {
		expect(normalizeApplicationsView("list")).toBe("list");
		expect(normalizeApplicationsView("kanban")).toBe("kanban");
	});
});

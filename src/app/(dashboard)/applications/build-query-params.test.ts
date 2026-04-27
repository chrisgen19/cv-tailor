import { describe, expect, it } from "vitest";
import { buildApplicationsQueryParams } from "./build-query-params";

const base = {
	page: 2,
	status: "ALL",
	search: "",
	sortField: "createdAt",
	sortOrder: "desc",
};

describe("buildApplicationsQueryParams", () => {
	it("uses pagination + status filter in list mode", () => {
		const p = buildApplicationsQueryParams({ ...base, view: "list", status: "APPLIED" });
		expect(p.get("page")).toBe("2");
		expect(p.get("limit")).toBe("20");
		expect(p.get("status")).toBe("APPLIED");
		expect(p.get("sort")).toBe("createdAt");
		expect(p.get("order")).toBe("desc");
	});

	it("omits the status filter in list mode when status is ALL", () => {
		const p = buildApplicationsQueryParams({ ...base, view: "list" });
		expect(p.get("status")).toBeNull();
	});

	it("uses limit=500 and ignores status + page in kanban mode", () => {
		const p = buildApplicationsQueryParams({ ...base, view: "kanban", status: "APPLIED" });
		expect(p.get("limit")).toBe("500");
		expect(p.get("page")).toBe("1");
		// Kanban renders every status as a column — no server-side status filter.
		expect(p.get("status")).toBeNull();
	});

	it("includes search in both modes", () => {
		const list = buildApplicationsQueryParams({ ...base, view: "list", search: "acme" });
		const kanban = buildApplicationsQueryParams({ ...base, view: "kanban", search: "acme" });
		expect(list.get("search")).toBe("acme");
		expect(kanban.get("search")).toBe("acme");
	});

	it("respects custom pageSize / kanbanLimit overrides", () => {
		const list = buildApplicationsQueryParams({ ...base, view: "list", pageSize: 50 });
		expect(list.get("limit")).toBe("50");
		const kanban = buildApplicationsQueryParams({ ...base, view: "kanban", kanbanLimit: 100 });
		expect(kanban.get("limit")).toBe("100");
	});
});

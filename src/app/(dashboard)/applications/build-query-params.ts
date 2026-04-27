import type { ApplicationsView } from "@/lib/applications-view";

export const APPLICATIONS_PAGE_SIZE = 20;
// Kanban v1 fetches all rows; we don't paginate columns.
export const KANBAN_FETCH_LIMIT = 500;

/**
 * Builds the query string for `GET /api/applications`. Kanban view fetches
 * everything in one shot (no status filter, no pagination); list view honors
 * the active filter + page. Pulled out of the page component so it's testable
 * without importing the client component tree.
 */
export function buildApplicationsQueryParams(args: {
	view: ApplicationsView;
	page: number;
	status: string;
	search: string;
	sortField: string;
	sortOrder: string;
	pageSize?: number;
	kanbanLimit?: number;
}): URLSearchParams {
	const params = new URLSearchParams({ sort: args.sortField, order: args.sortOrder });
	if (args.view === "kanban") {
		params.set("page", "1");
		params.set("limit", String(args.kanbanLimit ?? KANBAN_FETCH_LIMIT));
	} else {
		params.set("page", String(args.page));
		params.set("limit", String(args.pageSize ?? APPLICATIONS_PAGE_SIZE));
		if (args.status !== "ALL") params.set("status", args.status);
	}
	if (args.search) params.set("search", args.search);
	return params;
}

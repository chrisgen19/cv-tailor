export const APPLICATIONS_VIEWS = ["list", "kanban"] as const;
export type ApplicationsView = (typeof APPLICATIONS_VIEWS)[number];

export const DEFAULT_APPLICATIONS_VIEW: ApplicationsView = "list";
export const APPLICATIONS_VIEW_COOKIE = "cvt_applications_view";

export function isApplicationsView(value: string | null | undefined): value is ApplicationsView {
	return APPLICATIONS_VIEWS.includes(value as ApplicationsView);
}

export function normalizeApplicationsView(value: string | null | undefined): ApplicationsView {
	return isApplicationsView(value) ? value : DEFAULT_APPLICATIONS_VIEW;
}

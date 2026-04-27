import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
	APPLICATIONS_VIEW_COOKIE,
	APPLICATIONS_VIEWS,
	normalizeApplicationsView,
} from "@/lib/applications-view";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	normalizeThemeAccent,
	normalizeThemeMode,
	THEME_ACCENT_COOKIE,
	THEME_ACCENT_VALUES,
	THEME_MODE_COOKIE,
	THEME_MODES,
} from "@/lib/theme";

const updateProfileSchema = z
	.object({
		name: z.string().trim().min(1, "Name is required").optional(),
		themeMode: z.enum(THEME_MODES).optional(),
		themeAccent: z.enum(THEME_ACCENT_VALUES).optional(),
		applicationsView: z.enum(APPLICATIONS_VIEWS).optional(),
	})
	.refine(
		(data) =>
			typeof data.name !== "undefined" ||
			typeof data.themeMode !== "undefined" ||
			typeof data.themeAccent !== "undefined" ||
			typeof data.applicationsView !== "undefined",
		{ message: "At least one profile field is required" },
	);

const ONE_YEAR = 60 * 60 * 24 * 365;

function setPrefCookies(
	response: NextResponse,
	prefs: { themeMode: string; themeAccent: string; applicationsView: string },
) {
	const opts = {
		httpOnly: false,
		sameSite: "lax" as const,
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: ONE_YEAR,
	};
	response.cookies.set(THEME_MODE_COOKIE, prefs.themeMode, opts);
	response.cookies.set(THEME_ACCENT_COOKIE, prefs.themeAccent, opts);
	response.cookies.set(APPLICATIONS_VIEW_COOKIE, prefs.applicationsView, opts);
}

export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: {
			name: true,
			email: true,
			themeMode: true,
			themeAccent: true,
			applicationsView: true,
		},
	});

	if (!user) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	const prefs = {
		themeMode: normalizeThemeMode(user.themeMode),
		themeAccent: normalizeThemeAccent(user.themeAccent),
		applicationsView: normalizeApplicationsView(user.applicationsView),
	};
	const response = NextResponse.json({
		name: user.name,
		email: user.email,
		...prefs,
	});
	setPrefCookies(response, prefs);
	return response;
}

export async function PATCH(request: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json();
	const parsed = updateProfileSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const data: {
		name?: string;
		themeMode?: (typeof THEME_MODES)[number];
		themeAccent?: (typeof THEME_ACCENT_VALUES)[number];
		applicationsView?: (typeof APPLICATIONS_VIEWS)[number];
	} = {};

	if (typeof parsed.data.name !== "undefined") {
		data.name = parsed.data.name;
	}
	if (typeof parsed.data.themeMode !== "undefined") {
		data.themeMode = parsed.data.themeMode;
	}
	if (typeof parsed.data.themeAccent !== "undefined") {
		data.themeAccent = parsed.data.themeAccent;
	}
	if (typeof parsed.data.applicationsView !== "undefined") {
		data.applicationsView = parsed.data.applicationsView;
	}

	const updatedUser = await prisma.user.update({
		where: { id: session.user.id },
		data,
		select: {
			name: true,
			email: true,
			themeMode: true,
			themeAccent: true,
			applicationsView: true,
		},
	});

	const prefs = {
		themeMode: normalizeThemeMode(updatedUser.themeMode),
		themeAccent: normalizeThemeAccent(updatedUser.themeAccent),
		applicationsView: normalizeApplicationsView(updatedUser.applicationsView),
	};
	const response = NextResponse.json({
		success: true,
		profile: {
			name: updatedUser.name,
			email: updatedUser.email,
			...prefs,
		},
	});
	setPrefCookies(response, prefs);
	return response;
}

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
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

const updateProfileSchema = z.object({
	name: z.string().trim().min(1, "Name is required").optional(),
	themeMode: z.enum(THEME_MODES).optional(),
	themeAccent: z.enum(THEME_ACCENT_VALUES).optional(),
})
	.refine(
		(data) =>
			typeof data.name !== "undefined" ||
			typeof data.themeMode !== "undefined" ||
			typeof data.themeAccent !== "undefined",
		{ message: "At least one profile field is required" },
	);

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
		},
	});

	if (!user) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	const response = NextResponse.json({
		name: user.name,
		email: user.email,
		themeMode: normalizeThemeMode(user.themeMode),
		themeAccent: normalizeThemeAccent(user.themeAccent),
	});
	response.cookies.set(THEME_MODE_COOKIE, normalizeThemeMode(user.themeMode), {
		httpOnly: false,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: 60 * 60 * 24 * 365,
	});
	response.cookies.set(THEME_ACCENT_COOKIE, normalizeThemeAccent(user.themeAccent), {
		httpOnly: false,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: 60 * 60 * 24 * 365,
	});
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

	const updatedUser = await prisma.user.update({
		where: { id: session.user.id },
		data,
		select: {
			name: true,
			email: true,
			themeMode: true,
			themeAccent: true,
		},
	});

	const response = NextResponse.json({
		success: true,
		profile: {
			name: updatedUser.name,
			email: updatedUser.email,
			themeMode: normalizeThemeMode(updatedUser.themeMode),
			themeAccent: normalizeThemeAccent(updatedUser.themeAccent),
		},
	});
	response.cookies.set(THEME_MODE_COOKIE, normalizeThemeMode(updatedUser.themeMode), {
		httpOnly: false,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: 60 * 60 * 24 * 365,
	});
	response.cookies.set(THEME_ACCENT_COOKIE, normalizeThemeAccent(updatedUser.themeAccent), {
		httpOnly: false,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: 60 * 60 * 24 * 365,
	});
	return response;
}

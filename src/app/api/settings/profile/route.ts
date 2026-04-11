import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	DEFAULT_THEME_ACCENT,
	DEFAULT_THEME_MODE,
	THEME_ACCENT_VALUES,
	THEME_MODES,
	isThemeAccent,
	isThemeMode,
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

	return NextResponse.json({
		name: user.name,
		email: user.email,
		themeMode: isThemeMode(user.themeMode) ? user.themeMode : DEFAULT_THEME_MODE,
		themeAccent: isThemeAccent(user.themeAccent) ? user.themeAccent : DEFAULT_THEME_ACCENT,
	});
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

	return NextResponse.json({
		success: true,
		profile: {
			name: updatedUser.name,
			email: updatedUser.email,
			themeMode: isThemeMode(updatedUser.themeMode)
				? updatedUser.themeMode
				: DEFAULT_THEME_MODE,
			themeAccent: isThemeAccent(updatedUser.themeAccent)
				? updatedUser.themeAccent
				: DEFAULT_THEME_ACCENT,
		},
	});
}

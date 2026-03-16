import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateApplicationSchema } from "@/lib/validations";

async function getApplication(userId: string, id: string) {
	return prisma.jobApplication.findFirst({
		where: { id, userId },
	});
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;
	const application = await getApplication(session.user.id, id);
	if (!application) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	return NextResponse.json(application);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;
	const existing = await getApplication(session.user.id, id);
	if (!existing) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const body = await request.json();
	const parsed = updateApplicationSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const updated = await prisma.jobApplication.update({
		where: { id },
		data: parsed.data,
	});

	return NextResponse.json(updated);
}

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;
	const existing = await getApplication(session.user.id, id);
	if (!existing) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	await prisma.jobApplication.delete({ where: { id } });

	return NextResponse.json({ success: true });
}
